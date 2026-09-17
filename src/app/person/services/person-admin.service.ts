import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import {
  Person,
  PersonLicense,
  PersonProp,
  PersonRole,
} from '../person.schema';
import { Province } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { UserRole } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { isValidVideoUrl } from '../../../common/utils/video-url.util';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AuthenticatedUser } from '../../auth/types';
import { AdminListPeopleDto } from '../dtos/admin-list-people.dto';
import { CreatePersonDto } from '../dtos/create-person.dto';
import { UpdatePersonDto } from '../dtos/update-person.dto';
import { CreatePersonLicenseDto } from '../dtos/person-license.dto';
import { ReorderDirection, ReorderPersonDto } from '../dtos/reorder-person.dto';
import {
  IPersonAdminService,
  PaginatedPeople,
} from '../interfaces/person-admin-service.interface';
import {
  isValidSubRoleForRole,
  roleKeepsPositionTitle,
  roleKeepsProvince,
  roleKeepsSubRole,
} from '../utils/person-role.util';

/**
 * Administrative Person Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative person management, license tracking, role field
 * sanitization, and province-scoped access control.
 */
@Injectable()
export class PersonAdminService implements IPersonAdminService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<Person>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Lists personnel with pagination, status filter, role filter, and admin scoping.
   */
  async findAll(
    query?: AdminListPeopleDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedPeople> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Person> = {};

    // Scoping check: If the user only has PROVINCE_ADMIN role, limit to province officials in their managed provinces
    const isSuper = user?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (!isSuper) {
      const isProvinceAdmin = user?.roles?.includes(UserRole.PROVINCE_ADMIN);
      if (isProvinceAdmin && user?.managedProvinces) {
        filter.role = PersonRole.PROVINCE_OFFICIAL;
        filter.province = { $in: user.managedProvinces };
      } else {
        filter._id = null; // No roles authorized
      }
    }

    if (query?.role) {
      filter.role = query.role;
    }

    if (query?.subRole && query.subRole.trim()) {
      filter.subRole = query.subRole.trim().toLowerCase();
    }

    if (query?.province && query.province.trim()) {
      if (isValidObjectId(query.province.trim())) {
        filter.province = new Types.ObjectId(query.province.trim());
      }
    }

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'name.en': regex },
        { 'name.fa': regex },
        { 'positionTitle.en': regex },
        { 'positionTitle.fa': regex },
        { 'about.en': regex },
        { 'about.fa': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.personModel
        .find(filter)
        .select(PersonProp.admin)
        .populate('province')
        .sort({ role: 1, order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.personModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves any person by MongoDB ObjectId, enforcing province-admin scoping.
   */
  async findById(id: string, user?: AuthenticatedUser): Promise<Person> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel
      .findById(id)
      .select(PersonProp.admin)
      .populate('province')
      .exec();

    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?._id?.toString(), user);

    return person;
  }

  /**
   * Creates a new person record with domain validation for role-specific fields.
   */
  async create(
    dto: CreatePersonDto,
    user?: AuthenticatedUser,
  ): Promise<Person> {
    this.assertPersonScope(dto.role, dto.province, user);
    await this.validateRoleFields(
      dto.role,
      dto.subRole,
      dto.province,
      dto.introVideoUrl,
    );

    let order = dto.order;
    if (order === undefined || order === null) {
      const highest = await this.personModel
        .findOne({ role: dto.role })
        .sort({ order: -1 })
        .select('order')
        .exec();
      order = highest ? highest.order + 1 : 0;
    }

    const sanitized = this.sanitizeRoleFields(dto);

    const licenses = dto.licenses?.map((l) => ({
      title: {
        en: l.title.en.trim(),
        fa: l.title.fa?.trim(),
      },
      image: toMediaFile(l.image),
      createdAt: new Date(),
    })) as PersonLicense[];

    return this.personModel.create({
      name: {
        en: dto.name.en.trim(),
        fa: dto.name.fa?.trim(),
      },
      photo: toMediaFile(dto.photo),
      role: dto.role,
      subRole: sanitized.subRole,
      positionTitle: sanitized.positionTitle,
      about: dto.about
        ? {
            en: dto.about.en.trim(),
            fa: dto.about.fa?.trim(),
          }
        : undefined,
      resume: dto.resume
        ? {
            en: dto.resume.en.trim(),
            fa: dto.resume.fa?.trim(),
          }
        : undefined,
      resumeFile: toMediaFile(dto.resumeFile),
      introVideoUrl: dto.introVideoUrl ? dto.introVideoUrl.trim() : undefined,
      contact: dto.contact
        ? {
            en: dto.contact.en.trim(),
            fa: dto.contact.fa?.trim(),
          }
        : undefined,
      province: sanitized.province,
      licenses: licenses ?? [],
      order,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
  }

  /**
   * Updates an existing person record with role sanitization and scoping checks.
   */
  async update(
    id: string,
    dto: UpdatePersonDto,
    user?: AuthenticatedUser,
  ): Promise<Person> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(id).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    const targetRole = dto.role ?? person.role;
    const targetProvince =
      dto.province !== undefined ? dto.province : person.province?.toString();

    this.assertPersonScope(targetRole, targetProvince, user);
    await this.validateRoleFields(
      targetRole,
      dto.subRole !== undefined ? dto.subRole : person.subRole,
      targetProvince,
      dto.introVideoUrl !== undefined
        ? dto.introVideoUrl
        : person.introVideoUrl,
    );

    if (dto.name) {
      person.name = {
        en: dto.name.en ? dto.name.en.trim() : person.name.en,
        fa: dto.name.fa !== undefined ? dto.name.fa.trim() : person.name.fa,
      };
    }

    if (dto.role) {
      person.role = dto.role;
    }

    if (dto.photo !== undefined) {
      person.photo = toMediaFile(dto.photo);
    }

    if (dto.resumeFile !== undefined) {
      person.resumeFile = toMediaFile(dto.resumeFile);
    }

    if (dto.introVideoUrl !== undefined) {
      person.introVideoUrl = dto.introVideoUrl
        ? dto.introVideoUrl.trim()
        : undefined;
    }

    if (dto.about) {
      person.about = {
        en: dto.about.en ? dto.about.en.trim() : (person.about?.en ?? ''),
        fa: dto.about.fa !== undefined ? dto.about.fa.trim() : person.about?.fa,
      };
    }

    if (dto.resume) {
      person.resume = {
        en: dto.resume.en ? dto.resume.en.trim() : (person.resume?.en ?? ''),
        fa:
          dto.resume.fa !== undefined
            ? dto.resume.fa.trim()
            : person.resume?.fa,
      };
    }

    if (dto.contact) {
      person.contact = {
        en: dto.contact.en ? dto.contact.en.trim() : (person.contact?.en ?? ''),
        fa:
          dto.contact.fa !== undefined
            ? dto.contact.fa.trim()
            : person.contact?.fa,
      };
    }

    if (dto.order !== undefined) {
      person.order = dto.order;
    }

    if (dto.status !== undefined) {
      person.status = dto.status;
    }

    // Role-dependent field updates and sanitization
    if (roleKeepsSubRole(person.role)) {
      if (dto.subRole !== undefined) {
        person.subRole = dto.subRole
          ? dto.subRole.trim().toLowerCase()
          : undefined;
      }
    } else {
      person.subRole = undefined;
    }

    if (roleKeepsPositionTitle(person.role)) {
      if (dto.positionTitle !== undefined) {
        person.positionTitle = dto.positionTitle
          ? {
              en: dto.positionTitle.en.trim(),
              fa: dto.positionTitle.fa?.trim(),
            }
          : undefined;
      }
    } else {
      person.positionTitle = undefined;
    }

    if (roleKeepsProvince(person.role)) {
      if (dto.province !== undefined) {
        person.province = dto.province
          ? (new Types.ObjectId(dto.province) as unknown as Province)
          : undefined;
      }
    } else {
      person.province = undefined;
    }

    return person.save();
  }

  /**
   * Toggles the active status of a person.
   */
  async toggleStatus(id: string, user?: AuthenticatedUser): Promise<Person> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(id).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    person.status =
      person.status === ActiveStatus.ACTIVE
        ? ActiveStatus.DISABLED
        : ActiveStatus.ACTIVE;

    return person.save();
  }

  /**
   * Reorders a person by swapping display order with the adjacent person within the same role.
   */
  async reorder(
    id: string,
    dto: ReorderPersonDto,
    user?: AuthenticatedUser,
  ): Promise<Person[]> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(id).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    const groupFilter: QueryFilter<Person> = { role: person.role };
    if (person.role === PersonRole.PROVINCE_OFFICIAL && person.province) {
      groupFilter.province = person.province;
    }

    const group = await this.personModel
      .find(groupFilter)
      .sort({ order: 1, createdAt: 1 })
      .exec();

    const i = group.findIndex((p) => p._id.toString() === id);
    if (i === -1) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(translate('errors.CANNOT_REORDER_PERSON'));
    }

    if (dto.dir === ReorderDirection.DOWN && i === group.length - 1) {
      throw new BadRequestException(translate('errors.CANNOT_REORDER_PERSON'));
    }

    const j = dto.dir === ReorderDirection.UP ? i - 1 : i + 1;

    let orderI = group[i].order;
    let orderJ = group[j].order;

    if (orderI === orderJ) {
      orderI = i;
      orderJ = j;
    }

    await Promise.all([
      this.personModel.findByIdAndUpdate(group[i]._id, { order: orderJ }),
      this.personModel.findByIdAndUpdate(group[j]._id, { order: orderI }),
    ]);

    return this.personModel
      .find(groupFilter)
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Appends a new professional license to a person's profile.
   */
  async addLicense(
    personId: string,
    dto: CreatePersonLicenseDto,
    user?: AuthenticatedUser,
  ): Promise<Person> {
    if (!isValidObjectId(personId)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(personId).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    person.licenses.push({
      title: {
        en: dto.title.en.trim(),
        fa: dto.title.fa?.trim(),
      },
      image: toMediaFile(dto.image),
      createdAt: new Date(),
    });

    return person.save();
  }

  /**
   * Removes a license from a person's profile.
   */
  async deleteLicense(
    personId: string,
    licenseId: string,
    user?: AuthenticatedUser,
  ): Promise<Person> {
    if (!isValidObjectId(personId)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(personId).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    const initialCount = person.licenses.length;
    person.licenses = person.licenses.filter(
      (lic: any) => lic._id?.toString() !== licenseId,
    );

    if (person.licenses.length === initialCount) {
      throw new NotFoundException(translate('errors.LICENSE_NOT_FOUND'));
    }

    return person.save();
  }

  /**
   * Disables or soft-deletes a person.
   */
  async delete(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel.findById(id).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    this.assertPersonScope(person.role, person.province?.toString(), user);

    person.status = ActiveStatus.DISABLED;
    await person.save();

    return { success: true };
  }

  /**
   * Asserts that if the user is a province-scoped admin, they can only manage
   * PROVINCE_OFFICIAL roles within their assigned provinces.
   */
  private assertPersonScope(
    role: PersonRole,
    provinceId?: string,
    user?: AuthenticatedUser,
  ): void {
    if (!user) return;

    const isSuper = user.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (isSuper) return;

    const isProvinceAdmin = user.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (isProvinceAdmin) {
      if (role !== PersonRole.PROVINCE_OFFICIAL) {
        throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
      }
      if (!provinceId || !user.managedProvinces?.includes(provinceId)) {
        throw new ForbiddenException(
          translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
        );
      }
      return;
    }

    throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
  }

  /**
   * Validates business rules across role-dependent fields.
   */
  private async validateRoleFields(
    role: PersonRole,
    subRole?: string,
    provinceId?: string,
    introVideoUrl?: string,
  ): Promise<void> {
    if (!isValidSubRoleForRole(role, subRole)) {
      throw new BadRequestException(translate('errors.INVALID_SUB_ROLE'));
    }

    if (roleKeepsProvince(role)) {
      if (!provinceId) {
        throw new BadRequestException(
          translate('errors.PROVINCE_REQUIRED_FOR_OFFICIAL'),
        );
      }
      const provinceExists = await this.provinceModel.exists({
        _id: provinceId,
      });
      if (!provinceExists) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }
    }

    if (introVideoUrl && !isValidVideoUrl(introVideoUrl)) {
      throw new BadRequestException(translate('errors.INVALID_VIDEO_URL'));
    }
  }

  /**
   * Sanitizes role-specific fields for insertion.
   */
  private sanitizeRoleFields(dto: CreatePersonDto): {
    subRole?: string;
    positionTitle?: any;
    province?: Types.ObjectId;
  } {
    const subRole = roleKeepsSubRole(dto.role)
      ? dto.subRole?.trim().toLowerCase()
      : undefined;

    const positionTitle =
      roleKeepsPositionTitle(dto.role) && dto.positionTitle
        ? {
            en: dto.positionTitle.en.trim(),
            fa: dto.positionTitle.fa?.trim(),
          }
        : undefined;

    const province =
      roleKeepsProvince(dto.role) && dto.province
        ? new Types.ObjectId(dto.province)
        : undefined;

    return { subRole, positionTitle, province };
  }
}

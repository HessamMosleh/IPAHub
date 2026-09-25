import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { User, UserProp, UserRole, UserStatus } from '../user.schema';
import { MemberDocument, MemberDocumentKind } from '../member-document.schema';
import { Province } from '../../../common/schemas/province.schema';
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '../../membership/schemas/membership-request.schema';
import { AuthenticatedUser } from '../../auth/types';
import { translate } from '../../../common/utils/translate';
import { toInternationalMobile } from '../../../common/utils/mobile.util';
import { SmsSender } from '../../auth/sms.stub';
import { UserService } from './user.service';
import { AdminListUsersDto } from '../dtos/admin-list-users.dto';
import { AdminListAdminsDto } from '../dtos/admin-list-admins.dto';
import { CreateProvinceAdminDto } from '../dtos/create-province-admin.dto';
import { UpdateProvinceAdminDto } from '../dtos/update-province-admin.dto';
import { RejectUserDto } from '../dtos/reject-user.dto';
import { MemberDocumentResponseDto } from '../dtos/member-document-response.dto';
import {
  IUserAdminService,
  PaginatedUsers,
} from '../interfaces/user-admin-service.interface';

/** The first membership number ever handed out. Incremented, never reused. */
const MEMBERSHIP_NO_BASE = 1000;
const DUPLICATE_KEY_ERROR = 11000;

/**
 * Administrative User Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates member directory review (list / approve / reject / documents) and
 * province-admin account CRUD for super administrators.
 */
@Injectable()
export class UserAdminService implements IUserAdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
    @InjectModel(MemberDocument.name)
    private readonly memberDocumentModel: Model<MemberDocument>,
    @InjectModel(MembershipRequest.name)
    private readonly membershipRequestModel: Model<MembershipRequest>,
    private readonly userService: UserService,
    private readonly smsSender: SmsSender,
  ) {}

  // --- Members --------------------------------------------------------------

  async findAllMembers(
    query?: AdminListUsersDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedUsers> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = this.memberBaseFilter(admin);

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.province && isValidObjectId(query.province)) {
      this.assertProvinceFilterAllowed(query.province, admin);
      filter.province = new Types.ObjectId(query.province);
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { fullName: regex },
        { latinFullName: regex },
        { mobile: regex },
        { nationalCode: regex },
        { email: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(UserProp.admin)
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async countPendingMembers(
    admin?: AuthenticatedUser,
  ): Promise<{ count: number }> {
    const filter = this.memberBaseFilter(admin);
    filter.status = UserStatus.REGISTERING;
    const count = await this.userModel.countDocuments(filter).exec();
    return { count };
  }

  async findMemberById(id: string, admin?: AuthenticatedUser): Promise<User> {
    const user = await this.loadMember(id);
    this.assertMemberScope(user, admin);
    return user;
  }

  async approveMember(id: string, admin?: AuthenticatedUser): Promise<User> {
    const user = await this.loadMember(id);
    this.assertMemberScope(user, admin);

    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException(
        translate('errors.CANNOT_APPROVE_DELETED_USER'),
      );
    }

    // Direct approve must not bypass an outstanding membership bill.
    const billed = await this.membershipRequestModel
      .exists({
        user: user._id,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      })
      .exec();
    if (billed) {
      throw new BadRequestException(
        translate('errors.MEMBER_HAS_OUTSTANDING_BILL'),
      );
    }

    if (user.membershipNo === undefined || user.membershipNo === null) {
      user.membershipNo = await this.nextMembershipNo();
    }

    user.status = UserStatus.ACTIVE;
    user.rejectionReason = undefined as unknown as string;
    await user.save();

    await this.smsSender.send(
      user.mobile,
      `IPA: your membership is approved. Your membership number is ${user.membershipNo}.`,
    );

    return this.loadMember(id);
  }

  async rejectMember(
    id: string,
    dto: RejectUserDto,
    admin?: AuthenticatedUser,
  ): Promise<User> {
    const user = await this.loadMember(id);
    this.assertMemberScope(user, admin);

    // Never downgrade an approved member from this screen.
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException(
        translate('errors.CANNOT_REJECT_ACTIVE_MEMBER'),
      );
    }

    const reason = dto?.reason?.trim() || undefined;
    const now = new Date();

    await this.membershipRequestModel
      .updateMany(
        {
          user: user._id,
          status: {
            $in: [
              MembershipRequestStatus.PENDING,
              MembershipRequestStatus.AWAITING_PAYMENT,
            ],
          },
        },
        {
          $set: {
            status: MembershipRequestStatus.REJECTED,
            decidedAt: now,
            ...(reason ? { rejectionReason: reason } : {}),
          },
        },
      )
      .exec();

    user.status = UserStatus.REJECTED;
    user.rejectionReason = reason as unknown as string;
    await user.save();

    await this.smsSender.send(
      user.mobile,
      `IPA: your membership application was not approved.${reason ? ` Reason: ${reason}` : ''}`,
    );

    return this.loadMember(id);
  }

  async listMemberDocuments(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<MemberDocumentResponseDto[]> {
    await this.findMemberById(id, admin);
    return this.userService.listDocuments(id);
  }

  async getMemberDocument(
    id: string,
    kind: string,
    admin?: AuthenticatedUser,
  ): Promise<MemberDocument> {
    await this.findMemberById(id, admin);
    if (
      !Object.values(MemberDocumentKind).includes(kind as MemberDocumentKind)
    ) {
      throw new BadRequestException(translate('errors.INVALID_DOCUMENT_KIND'));
    }
    return this.userService.getDocument(id, kind as MemberDocumentKind);
  }

  // --- Province admins ------------------------------------------------------

  async findAllAdmins(query?: AdminListAdminsDto): Promise<PaginatedUsers> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<User> = {
      status: { $ne: UserStatus.DELETED },
      // Province admins only — exclude anyone who also carries a global role.
      roles: {
        $eq: [UserRole.PROVINCE_ADMIN],
      },
    };

    if (query?.active !== undefined) {
      filter.active = query.active;
    }

    if (query?.province && isValidObjectId(query.province)) {
      (filter as Record<string, unknown>).managedProvinces = new Types.ObjectId(
        query.province,
      );
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { fullName: regex },
        { latinFullName: regex },
        { mobile: regex },
        { email: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(UserProp.admin)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findAdminById(id: string): Promise<User> {
    return this.loadProvinceAdmin(id);
  }

  async createProvinceAdmin(dto: CreateProvinceAdminDto): Promise<User> {
    await this.ensureProvincesExist(dto.managedProvinces);

    const mobile = toInternationalMobile(dto.mobile);
    await this.ensureUniqueIdentity(mobile, dto.nationalCode);

    const password = await this.userService.hashPassword(dto.password);
    const managed = dto.managedProvinces.map((p) => new Types.ObjectId(p));

    try {
      const created = await this.userModel.create({
        mobile,
        nationalCode: dto.nationalCode,
        fullName: dto.fullName,
        latinFullName: dto.latinFullName,
        email: dto.email,
        password,
        roles: [UserRole.PROVINCE_ADMIN],
        province: managed[0],
        managedProvinces: managed,
        status: UserStatus.ACTIVE,
        active: dto.active !== false,
        mobileVerifiedAt: new Date(),
      });
      return this.loadProvinceAdmin(created._id.toString());
    } catch (error) {
      this.throwIfDuplicateKey(error);
      throw error;
    }
  }

  async updateProvinceAdmin(
    id: string,
    dto: UpdateProvinceAdminDto,
  ): Promise<User> {
    const admin = await this.loadProvinceAdmin(id);

    if (dto.managedProvinces) {
      await this.ensureProvincesExist(dto.managedProvinces);
      admin.managedProvinces = dto.managedProvinces.map(
        (p) => new Types.ObjectId(p),
      ) as unknown as Province[];
      // Keep the home province inside the managed set.
      const homeId =
        typeof admin.province === 'object' &&
        admin.province &&
        '_id' in admin.province
          ? (admin.province as { _id: Types.ObjectId })._id.toString()
          : String(admin.province);
      if (!dto.managedProvinces.includes(homeId)) {
        admin.province = new Types.ObjectId(
          dto.managedProvinces[0],
        ) as unknown as Province;
      }
    }

    if (dto.fullName !== undefined) admin.fullName = dto.fullName;
    if (dto.latinFullName !== undefined)
      admin.latinFullName = dto.latinFullName;
    if (dto.email !== undefined) admin.email = dto.email;
    if (dto.active !== undefined) admin.active = dto.active;

    if (dto.password && dto.password.length >= 8) {
      admin.password = await this.userService.hashPassword(dto.password);
    }

    await admin.save();
    return this.loadProvinceAdmin(id);
  }

  async deleteProvinceAdmin(id: string): Promise<{ success: boolean }> {
    const admin = await this.loadProvinceAdmin(id);
    admin.status = UserStatus.DELETED;
    admin.active = false;
    await admin.save();
    return { success: true };
  }

  // --- Helpers --------------------------------------------------------------

  private memberBaseFilter(admin?: AuthenticatedUser): QueryFilter<User> {
    const filter: QueryFilter<User> = {
      status: { $ne: UserStatus.DELETED },
      roles: UserRole.USER,
    };

    const scoped = this.scopedProvinceIds(admin);
    if (scoped) {
      filter.province = { $in: scoped };
    } else if (admin && !this.isGlobalAdmin(admin)) {
      // Authenticated but not authorised for any province — empty result set.
      filter._id = null;
    }

    return filter;
  }

  private async loadMember(id: string): Promise<User> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const user = await this.userModel
      .findOne({
        _id: id,
        status: { $ne: UserStatus.DELETED },
        roles: UserRole.USER,
      })
      .select(UserProp.admin)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }
    return user;
  }

  private async loadProvinceAdmin(id: string): Promise<User> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.ADMIN_NOT_FOUND'));
    }

    const user = await this.userModel
      .findOne({
        _id: id,
        status: { $ne: UserStatus.DELETED },
        roles: { $eq: [UserRole.PROVINCE_ADMIN] },
      })
      .select(UserProp.admin)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.ADMIN_NOT_FOUND'));
    }

    return user;
  }

  private assertMemberScope(user: User, admin?: AuthenticatedUser): void {
    const scoped = this.scopedProvinceIds(admin);
    if (!scoped) return;

    const provinceId =
      typeof user.province === 'object' &&
      user.province &&
      '_id' in user.province
        ? (user.province as { _id: Types.ObjectId })._id.toString()
        : user.province
          ? String(user.province)
          : null;

    if (!provinceId || !scoped.some((p) => p.toString() === provinceId)) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }
  }

  private assertProvinceFilterAllowed(
    provinceId: string,
    admin?: AuthenticatedUser,
  ): void {
    const scoped = this.scopedProvinceIds(admin);
    if (!scoped) return;
    if (!scoped.some((p) => p.toString() === provinceId)) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }
  }

  private isGlobalAdmin(admin?: AuthenticatedUser): boolean {
    return !!admin?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
  }

  private scopedProvinceIds(
    admin?: AuthenticatedUser,
  ): Types.ObjectId[] | null {
    if (!admin) return null;
    if (this.isGlobalAdmin(admin)) return null;

    if (
      admin.roles?.includes(UserRole.PROVINCE_ADMIN) &&
      admin.managedProvinces &&
      admin.managedProvinces.length > 0
    ) {
      return admin.managedProvinces
        .filter((p) => isValidObjectId(p))
        .map((p) => new Types.ObjectId(p));
    }

    return null;
  }

  private async nextMembershipNo(): Promise<number> {
    const highest = await this.userModel
      .findOne({ membershipNo: { $ne: null } })
      .sort({ membershipNo: -1 })
      .select('membershipNo')
      .exec();

    return highest?.membershipNo
      ? highest.membershipNo + 1
      : MEMBERSHIP_NO_BASE;
  }

  private async ensureProvincesExist(ids: string[]): Promise<void> {
    if (!ids.length) {
      throw new BadRequestException(
        translate('errors.MANAGED_PROVINCES_REQUIRED'),
      );
    }

    const unique = [...new Set(ids)];
    const count = await this.provinceModel
      .countDocuments({ _id: { $in: unique } })
      .exec();
    if (count !== unique.length) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }
  }

  private async ensureUniqueIdentity(
    mobile: string,
    nationalCode: string,
  ): Promise<void> {
    const existing = await this.userModel
      .findOne({
        $or: [{ mobile }, { nationalCode }],
        status: { $ne: UserStatus.DELETED },
      })
      .select('mobile nationalCode')
      .lean()
      .exec();

    if (!existing) return;

    if (existing.mobile === mobile) {
      throw new ConflictException(translate('errors.MOBILE_EXISTS'));
    }
    throw new ConflictException(translate('errors.NATIONAL_CODE_EXISTS'));
  }

  private throwIfDuplicateKey(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === DUPLICATE_KEY_ERROR
    ) {
      const keyPattern = (error as { keyPattern?: Record<string, number> })
        .keyPattern;
      if (keyPattern?.mobile) {
        throw new ConflictException(translate('errors.MOBILE_EXISTS'));
      }
      if (keyPattern?.nationalCode) {
        throw new ConflictException(translate('errors.NATIONAL_CODE_EXISTS'));
      }
      throw new ConflictException(translate('errors.USER_EXISTS'));
    }
  }
}

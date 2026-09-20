import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { isEmail } from 'class-validator';
import {
  Province,
  ProvinceProp,
} from '../../../common/schemas/province.schema';
import { LocalizedText } from '../../../common/schemas/localized-text.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { UserRole } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { foldDigits } from '../../../common/utils/digit.util';
import {
  normalizeSocialUrl,
  normalizeWhatsapp,
} from '../../../common/utils/social-url.util';
import { AuthenticatedUser } from '../../auth/types';
import { AdminListProvincesDto } from '../dtos/admin-list-provinces.dto';
import { CreateProvinceDto } from '../dtos/create-province.dto';
import { UpdateProvinceDto } from '../dtos/update-province.dto';
import { UpdateProvinceSocialsDto } from '../dtos/update-province-socials.dto';
import { UpdateProvinceContactDto } from '../dtos/update-province-contact.dto';
import {
  ReorderDirection,
  ReorderProvinceDto,
} from '../dtos/reorder-province.dto';
import { DEFAULT_PROVINCES } from '../constants/default-provinces';
import {
  IProvinceAdminService,
  PaginatedProvinces,
} from '../interfaces/province-admin-service.interface';

/**
 * Administrative Province Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, scoping constraints, reordering,
 * and canonical seeding.
 */
@Injectable()
export class ProvinceAdminService implements IProvinceAdminService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Lists provinces with pagination, status filter, and optional admin-scope scoping.
   */
  async findAll(
    query?: AdminListProvincesDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedProvinces> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Province> = {};

    // Scoping check: if the admin only has PROVINCE_ADMIN role, limit to their managed provinces
    const isSuper = user?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (
      !isSuper &&
      user?.managedProvinces &&
      user.managedProvinces.length > 0
    ) {
      filter._id = { $in: user.managedProvinces };
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
        { slug: regex },
        { 'name.en': regex },
        { 'name.fa': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.provinceModel
        .find(filter)
        .select(ProvinceProp.admin)
        .sort({ order: 1, slug: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.provinceModel.countDocuments(filter).exec(),
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
   * Retrieves any province by id, enforcing province-admin scoping if applicable.
   */
  async findById(id: string, user?: AuthenticatedUser): Promise<Province> {
    this.assertProvinceScope(id, user);

    const province = await this.provinceModel
      .findById(id)
      .select(ProvinceProp.admin)
      .exec();

    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    return province;
  }

  /**
   * Creates a new province with unique slug verification.
   */
  async create(dto: CreateProvinceDto): Promise<Province> {
    const normalizedSlug = dto.slug.toLowerCase().trim();

    const existing = await this.provinceModel.findOne({ slug: normalizedSlug });
    if (existing) {
      throw new ConflictException(translate('errors.PROVINCE_SLUG_EXISTS'));
    }

    let order = dto.order;
    if (order === undefined || order === null) {
      const highest = await this.provinceModel
        .findOne()
        .sort({ order: -1 })
        .select('order')
        .exec();
      order = highest ? highest.order + 1 : 0;
    }

    const socials = dto.socials
      ? {
          facebook: normalizeSocialUrl(dto.socials.facebook),
          instagram: normalizeSocialUrl(dto.socials.instagram),
          telegram: normalizeSocialUrl(dto.socials.telegram),
          whatsapp: normalizeWhatsapp(dto.socials.whatsapp),
        }
      : undefined;

    let contactAddress: LocalizedText | undefined;
    if (dto.contactAddress) {
      const en = dto.contactAddress.en?.trim();
      const fa = dto.contactAddress.fa?.trim();
      if (en || fa) {
        contactAddress = {
          en: en ?? '',
          ...(fa ? { fa } : {}),
        };
      }
    }

    let contactPhone: string | undefined;
    if (dto.contactPhone && dto.contactPhone.trim()) {
      const folded = foldDigits(dto.contactPhone).trim();
      if (!/\d/.test(folded)) {
        throw new BadRequestException(translate('errors.INVALID_PHONE'));
      }
      contactPhone = folded;
    }

    let contactEmail: string | undefined;
    if (dto.contactEmail && dto.contactEmail.trim()) {
      const trimmedEmail = dto.contactEmail.trim();
      if (!isEmail(trimmedEmail)) {
        throw new BadRequestException(translate('errors.INVALID_EMAIL'));
      }
      contactEmail = trimmedEmail;
    }

    return this.provinceModel.create({
      slug: normalizedSlug,
      name: {
        en: dto.name.en.trim(),
        fa: dto.name.fa?.trim(),
      },
      order,
      socials,
      contactAddress,
      contactPhone,
      contactEmail,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
  }

  /**
   * Updates province properties (slug, name, status, order).
   */
  async update(id: string, dto: UpdateProvinceDto): Promise<Province> {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    if (dto.slug && dto.slug.toLowerCase().trim() !== province.slug) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      const existing = await this.provinceModel.findOne({
        slug: normalizedSlug,
      });
      if (existing) {
        throw new ConflictException(translate('errors.PROVINCE_SLUG_EXISTS'));
      }
      province.slug = normalizedSlug;
    }

    if (dto.name) {
      province.name = {
        en: dto.name.en ? dto.name.en.trim() : province.name.en,
        fa: dto.name.fa !== undefined ? dto.name.fa.trim() : province.name.fa,
      };
    }

    if (dto.order !== undefined) {
      province.order = dto.order;
    }

    if (dto.status !== undefined) {
      province.status = dto.status;
    }

    if (dto.socials) {
      province.socials = {
        facebook: normalizeSocialUrl(dto.socials.facebook),
        instagram: normalizeSocialUrl(dto.socials.instagram),
        telegram: normalizeSocialUrl(dto.socials.telegram),
        whatsapp: normalizeWhatsapp(dto.socials.whatsapp),
      };
    }

    if (dto.contactAddress !== undefined) {
      if (
        dto.contactAddress === null ||
        (!dto.contactAddress.en?.trim() && !dto.contactAddress.fa?.trim())
      ) {
        province.contactAddress = undefined;
      } else {
        province.contactAddress = {
          en: dto.contactAddress.en?.trim() ?? '',
          ...(dto.contactAddress.fa?.trim()
            ? { fa: dto.contactAddress.fa.trim() }
            : {}),
        };
      }
    }

    if (dto.contactPhone !== undefined) {
      if (dto.contactPhone === null || dto.contactPhone.trim() === '') {
        province.contactPhone = undefined;
      } else {
        const folded = foldDigits(dto.contactPhone).trim();
        if (!/\d/.test(folded)) {
          throw new BadRequestException(translate('errors.INVALID_PHONE'));
        }
        province.contactPhone = folded;
      }
    }

    if (dto.contactEmail !== undefined) {
      if (dto.contactEmail === null || dto.contactEmail.trim() === '') {
        province.contactEmail = undefined;
      } else {
        const trimmedEmail = dto.contactEmail.trim();
        if (!isEmail(trimmedEmail)) {
          throw new BadRequestException(translate('errors.INVALID_EMAIL'));
        }
        province.contactEmail = trimmedEmail;
      }
    }

    return province.save();
  }

  /**
   * Updates social links for a province, with URL and phone normalization.
   * Permitted for SUPER_ADMIN, ADMIN, or PROVINCE_ADMIN scoped to this province.
   */
  async updateSocials(
    id: string,
    dto: UpdateProvinceSocialsDto,
    user?: AuthenticatedUser,
  ): Promise<Province> {
    this.assertProvinceScope(id, user);

    const province = await this.provinceModel.findById(id).exec();
    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    province.socials = {
      facebook: normalizeSocialUrl(dto.facebook),
      instagram: normalizeSocialUrl(dto.instagram),
      telegram: normalizeSocialUrl(dto.telegram),
      whatsapp: normalizeWhatsapp(dto.whatsapp),
    };

    return province.save();
  }

  /**
   * Updates contact details for a province (address, phone, email).
   * Validates email format, folds phone digits to ASCII, and ensures phone contains digits.
   * Permitted for SUPER_ADMIN, ADMIN, or PROVINCE_ADMIN scoped to this province.
   */
  async updateContact(
    id: string,
    dto: UpdateProvinceContactDto,
    user?: AuthenticatedUser,
  ): Promise<Province> {
    this.assertProvinceScope(id, user);

    const province = await this.provinceModel.findById(id).exec();
    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    const rawAddress =
      dto.contactAddress !== undefined ? dto.contactAddress : dto.address;
    if (rawAddress !== undefined) {
      if (
        rawAddress === null ||
        (!rawAddress.en?.trim() && !rawAddress.fa?.trim())
      ) {
        province.contactAddress = undefined;
      } else {
        province.contactAddress = {
          en: rawAddress.en?.trim() ?? '',
          ...(rawAddress.fa?.trim() ? { fa: rawAddress.fa.trim() } : {}),
        };
      }
    }

    const rawPhone =
      dto.contactPhone !== undefined ? dto.contactPhone : dto.phone;
    if (rawPhone !== undefined) {
      if (rawPhone === null || rawPhone.trim() === '') {
        province.contactPhone = undefined;
      } else {
        const folded = foldDigits(rawPhone).trim();
        if (!/\d/.test(folded)) {
          throw new BadRequestException(translate('errors.INVALID_PHONE'));
        }
        province.contactPhone = folded;
      }
    }

    const rawEmail =
      dto.contactEmail !== undefined ? dto.contactEmail : dto.email;
    if (rawEmail !== undefined) {
      if (rawEmail === null || rawEmail.trim() === '') {
        province.contactEmail = undefined;
      } else {
        const trimmedEmail = rawEmail.trim();
        if (!isEmail(trimmedEmail)) {
          throw new BadRequestException(translate('errors.INVALID_EMAIL'));
        }
        province.contactEmail = trimmedEmail;
      }
    }

    return province.save();
  }

  /**
   * Swaps order with adjacent province in the requested direction.
   */
  async reorder(id: string, dto: ReorderProvinceDto): Promise<Province[]> {
    const all = await this.provinceModel
      .find()
      .sort({ order: 1, slug: 1 })
      .exec();

    const i = all.findIndex((p) => p._id.toString() === id);
    if (i === -1) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_PROVINCE'),
      );
    }

    if (dto.dir === ReorderDirection.DOWN && i === all.length - 1) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_PROVINCE'),
      );
    }

    const j = dto.dir === ReorderDirection.UP ? i - 1 : i + 1;

    let orderI = all[i].order;
    let orderJ = all[j].order;

    // If both entries shared the same order value, index sequentially before swapping
    if (orderI === orderJ) {
      orderI = i;
      orderJ = j;
    }

    await Promise.all([
      this.provinceModel.findByIdAndUpdate(all[i]._id, { order: orderJ }),
      this.provinceModel.findByIdAndUpdate(all[j]._id, { order: orderI }),
    ]);

    return this.provinceModel.find().sort({ order: 1, slug: 1 }).exec();
  }

  /**
   * Disables (soft-deletes) a province.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const province = await this.provinceModel.findById(id).exec();
    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    province.status = ActiveStatus.DISABLED;
    await province.save();

    return { success: true };
  }

  /**
   * Idempotently seeds the canonical 32 provinces if they do not yet exist.
   */
  async seed(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const p of DEFAULT_PROVINCES) {
      const res = await this.provinceModel.updateOne(
        { slug: p.slug },
        {
          $setOnInsert: {
            slug: p.slug,
            name: { en: p.en, fa: p.fa },
            order: p.order,
            status: ActiveStatus.ACTIVE,
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        seeded++;
      }
    }

    const total = await this.provinceModel.countDocuments();
    return { seeded, total };
  }

  /**
   * Asserts that if the user is a province-scoped admin, they are authorized
   * for this specific province ID.
   */
  private assertProvinceScope(id: string, user?: AuthenticatedUser): void {
    if (!user) return;

    const isSuper = user.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (isSuper) return;

    const isProvinceAdmin = user.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (
      isProvinceAdmin &&
      user.managedProvinces &&
      !user.managedProvinces.includes(id)
    ) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }
  }
}

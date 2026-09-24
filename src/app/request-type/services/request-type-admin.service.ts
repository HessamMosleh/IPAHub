import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  MEMBERSHIP_CARD_SLUG,
  ProvinceRequestPrice,
  RequestType,
  RequestTypeProp,
} from '../request-type.schema';
import { DocumentRequest } from '../../document-request/document-request.schema';
import { Province } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { slugify } from '../utils/slugify.util';
import { DEFAULT_REQUEST_TYPES } from '../constants/default-request-types';
import { AdminListRequestTypesDto } from '../dtos/admin-list-request-types.dto';
import { CreateRequestTypeDto } from '../dtos/create-request-type.dto';
import { UpdateRequestTypeDto } from '../dtos/update-request-type.dto';
import { SetRequestTypeProvincePricesDto } from '../dtos/set-request-type-province-prices.dto';
import {
  ReorderDirection,
  ReorderRequestTypeDto,
} from '../dtos/reorder-request-type.dto';
import {
  IRequestTypeAdminService,
  PaginatedRequestTypes,
} from '../interfaces/request-type-admin-service.interface';

/**
 * Administrative Request Type Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, pricing overrides, reordering,
 * soft/hard deletion, and canonical seeding.
 */
@Injectable()
export class RequestTypeAdminService implements IRequestTypeAdminService {
  constructor(
    @InjectModel(RequestType.name)
    private readonly requestTypeModel: Model<RequestType>,
    @InjectModel(DocumentRequest.name)
    private readonly documentRequestModel: Model<DocumentRequest>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Lists request types with pagination, status filter, and optional search.
   */
  async findAll(
    query?: AdminListRequestTypesDto,
  ): Promise<PaginatedRequestTypes> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<RequestType> = {};

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.producesDocument !== undefined) {
      filter.producesDocument = query.producesDocument;
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
      this.requestTypeModel
        .find(filter)
        .select(RequestTypeProp.admin)
        .populate('prices.province', 'slug name')
        .sort({ order: 1, slug: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.requestTypeModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves any request type by id, including inactive ones, with populated prices.
   */
  async findById(id: string): Promise<RequestType> {
    const type = await this.requestTypeModel
      .findById(id)
      .select(RequestTypeProp.admin)
      .populate('prices.province', 'slug name')
      .exec();

    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    return type;
  }

  /**
   * Retrieves any request type by slug, including inactive ones.
   */
  async findBySlug(slug: string): Promise<RequestType> {
    const type = await this.requestTypeModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .select(RequestTypeProp.admin)
      .populate('prices.province', 'slug name')
      .exec();

    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    return type;
  }

  /**
   * Creates a new request type. If slug is omitted, auto-generates a unique one from name.en.
   */
  async create(dto: CreateRequestTypeDto): Promise<RequestType> {
    if (!dto.name?.en?.trim()) {
      throw new BadRequestException(
        translate('validation.IS_NOT_EMPTY', { property: 'name.en' }),
      );
    }

    let slug: string;
    if (dto.slug && dto.slug.trim()) {
      const normalizedSlug = dto.slug.toLowerCase().trim();
      const existing = await this.requestTypeModel.findOne({
        slug: normalizedSlug,
      });
      if (existing) {
        throw new ConflictException(
          translate('errors.REQUEST_TYPE_SLUG_EXISTS'),
        );
      }
      slug = normalizedSlug;
    } else {
      slug = await this.generateUniqueSlug(dto.name.en);
    }

    let order = dto.order;
    if (order === undefined || order === null) {
      const highest = await this.requestTypeModel
        .findOne()
        .sort({ order: -1 })
        .select('order')
        .exec();
      order = highest ? highest.order + 1 : 0;
    }

    const baseFee =
      dto.baseFee !== undefined && dto.baseFee !== null
        ? Math.max(0, Number(dto.baseFee))
        : 0;

    const description = dto.description
      ? {
          en: dto.description.en?.trim() ?? '',
          ...(dto.description.fa?.trim()
            ? { fa: dto.description.fa.trim() }
            : {}),
        }
      : undefined;

    return this.requestTypeModel.create({
      slug,
      name: {
        en: dto.name.en.trim(),
        fa: dto.name.fa?.trim(),
      },
      description,
      baseFee,
      producesDocument: dto.producesDocument ?? true,
      order,
      status: dto.status ?? ActiveStatus.ACTIVE,
      prices: [],
    });
  }

  /**
   * Updates request type properties (name, description, baseFee, producesDocument, order, status, slug).
   */
  async update(id: string, dto: UpdateRequestTypeDto): Promise<RequestType> {
    const type = await this.requestTypeModel.findById(id).exec();
    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    if (dto.slug && dto.slug.toLowerCase().trim() !== type.slug) {
      if (type.slug === MEMBERSHIP_CARD_SLUG) {
        throw new BadRequestException(
          translate('errors.CANNOT_DELETE_CARD_REQUEST_TYPE'),
        );
      }

      const normalizedSlug = dto.slug.toLowerCase().trim();
      const existing = await this.requestTypeModel.findOne({
        slug: normalizedSlug,
      });
      if (existing) {
        throw new ConflictException(
          translate('errors.REQUEST_TYPE_SLUG_EXISTS'),
        );
      }
      type.slug = normalizedSlug;
    }

    if (dto.name) {
      if (dto.name.en !== undefined) {
        if (!dto.name.en.trim()) {
          throw new BadRequestException(
            translate('validation.IS_NOT_EMPTY', { property: 'name.en' }),
          );
        }
        type.name.en = dto.name.en.trim();
      }
      if (dto.name.fa !== undefined) {
        type.name.fa = dto.name.fa?.trim();
      }
    }

    if (dto.description !== undefined) {
      if (
        dto.description === null ||
        (!dto.description.en?.trim() && !dto.description.fa?.trim())
      ) {
        type.description = undefined;
      } else {
        type.description = {
          en: dto.description.en?.trim() ?? '',
          ...(dto.description.fa?.trim()
            ? { fa: dto.description.fa.trim() }
            : {}),
        };
      }
    }

    if (dto.baseFee !== undefined && dto.baseFee !== null) {
      type.baseFee = Math.max(0, Number(dto.baseFee));
    }

    if (dto.producesDocument !== undefined) {
      type.producesDocument = dto.producesDocument;
    }

    if (dto.order !== undefined && dto.order !== null) {
      type.order = dto.order;
    }

    if (dto.status !== undefined) {
      type.status = dto.status;
    }

    await type.save();
    return this.findById(id);
  }

  /**
   * Replaces or updates per-province price overrides for this request type.
   * Blank/null fees remove the override (fall back to base fee).
   * Validates that each referenced province exists.
   */
  async setProvincePrices(
    id: string,
    dto: SetRequestTypeProvincePricesDto,
  ): Promise<RequestType> {
    const type = await this.requestTypeModel.findById(id).exec();
    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    const overrides = dto.prices ?? [];
    const validOverrides: { province: Types.ObjectId; fee: number }[] = [];
    const seenProvinces = new Set<string>();

    for (const entry of overrides) {
      if (entry.fee === null || entry.fee === undefined) {
        continue;
      }

      const provId = entry.province.toString();
      if (seenProvinces.has(provId)) {
        continue;
      }
      seenProvinces.add(provId);

      const provinceDoc = await this.provinceModel
        .findById(entry.province)
        .exec();
      if (!provinceDoc) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }

      validOverrides.push({
        province: new Types.ObjectId(entry.province),
        fee: Math.max(0, Number(entry.fee)),
      });
    }

    type.prices = validOverrides as unknown as ProvinceRequestPrice[];
    await type.save();
    return this.findById(id);
  }

  /**
   * Swaps display order with an adjacent request type in the requested direction.
   */
  async reorder(
    id: string,
    dto: ReorderRequestTypeDto,
  ): Promise<RequestType[]> {
    const all = await this.requestTypeModel
      .find()
      .sort({ order: 1, slug: 1 })
      .exec();

    const i = all.findIndex((r) => r._id.toString() === id);
    if (i === -1) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_REQUEST_TYPE'),
      );
    }

    if (dto.dir === ReorderDirection.DOWN && i === all.length - 1) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_REQUEST_TYPE'),
      );
    }

    const j = dto.dir === ReorderDirection.UP ? i - 1 : i + 1;

    let orderI = all[i].order;
    let orderJ = all[j].order;

    if (orderI === orderJ) {
      orderI = i;
      orderJ = j;
    }

    await Promise.all([
      this.requestTypeModel.findByIdAndUpdate(all[i]._id, { order: orderJ }),
      this.requestTypeModel.findByIdAndUpdate(all[j]._id, { order: orderI }),
    ]);

    return this.requestTypeModel.find().sort({ order: 1, slug: 1 }).exec();
  }

  /**
   * Deletes a request type:
   * - Throws if trying to delete MEMBERSHIP_CARD_SLUG.
   * - If existing DocumentRequests reference it, soft-deletes (sets status: DISABLED).
   * - If unreferenced, permanently removes it.
   */
  async delete(
    id: string,
  ): Promise<{ success: boolean; softDeleted: boolean }> {
    const type = await this.requestTypeModel.findById(id).exec();
    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    if (type.slug === MEMBERSHIP_CARD_SLUG) {
      throw new BadRequestException(
        translate('errors.CANNOT_DELETE_CARD_REQUEST_TYPE'),
      );
    }

    const refs = await this.documentRequestModel
      .countDocuments({ requestType: id })
      .exec();

    if (refs > 0) {
      type.status = ActiveStatus.DISABLED;
      await type.save();
      return { success: true, softDeleted: true };
    }

    await this.requestTypeModel.findByIdAndDelete(id).exec();
    return { success: true, softDeleted: false };
  }

  /**
   * Idempotently seeds canonical request types without resetting prices admins have set.
   */
  async seed(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const r of DEFAULT_REQUEST_TYPES) {
      const res = await this.requestTypeModel.updateOne(
        { slug: r.slug },
        {
          $setOnInsert: {
            slug: r.slug,
            name: { en: r.name.en, fa: r.name.fa },
            baseFee: r.baseFee,
            producesDocument: r.producesDocument,
            order: r.order,
            status: ActiveStatus.ACTIVE,
            prices: [],
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        seeded++;
      }
    }

    const total = await this.requestTypeModel.countDocuments().exec();
    return { seeded, total };
  }

  /**
   * Generates a unique kebab-case slug by checking database availability.
   */
  private async generateUniqueSlug(baseName: string): Promise<string> {
    const baseSlug = slugify(baseName);
    let candidate = baseSlug;
    let n = 1;

    while (await this.requestTypeModel.findOne({ slug: candidate })) {
      n += 1;
      candidate = `${baseSlug}-${n}`;
    }

    return candidate;
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import {
  CommunityService,
  CommunityServiceProp,
} from '../community-service.schema';
import { translate } from '../../../common/utils/translate';
import { AdminListCommunityServicesDto } from '../dtos/admin-list-community-services.dto';
import { CreateCommunityServiceDto } from '../dtos/create-community-service.dto';
import { UpdateCommunityServiceDto } from '../dtos/update-community-service.dto';
import {
  ReorderCommunityServiceDto,
  ReorderDirection,
} from '../dtos/reorder-community-service.dto';
import { DEFAULT_COMMUNITY_SERVICES } from '../constants/default-community-services';
import {
  ICommunityServiceAdminService,
  PaginatedCommunityServices,
} from '../interfaces/community-service-admin-service.interface';

/**
 * Administrative Community Service Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, pagination, reordering, and canonical seeding.
 */
@Injectable()
export class CommunityServiceAdminService implements ICommunityServiceAdminService {
  constructor(
    @InjectModel(CommunityService.name)
    private readonly communityServiceModel: Model<CommunityService>,
  ) {}

  /**
   * Lists community services with pagination and search filter.
   */
  async findAll(
    query?: AdminListCommunityServicesDto,
  ): Promise<PaginatedCommunityServices> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<CommunityService> = {};

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'title.en': regex },
        { 'title.fa': regex },
        { 'description.en': regex },
        { 'description.fa': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.communityServiceModel
        .find(filter)
        .select(CommunityServiceProp.admin)
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.communityServiceModel.countDocuments(filter).exec(),
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
   * Retrieves any community service by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<CommunityService> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    const service = await this.communityServiceModel
      .findById(id)
      .select(CommunityServiceProp.admin)
      .exec();

    if (!service) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    return service;
  }

  /**
   * Creates a new community service.
   */
  async create(dto: CreateCommunityServiceDto): Promise<CommunityService> {
    let order = dto.order;
    if (order === undefined || order === null) {
      const highest = await this.communityServiceModel
        .findOne()
        .sort({ order: -1 })
        .select('order')
        .exec();
      order = highest ? highest.order + 1 : 0;
    }

    return this.communityServiceModel.create({
      title: {
        en: dto.title.en.trim(),
        fa: dto.title.fa?.trim(),
      },
      description: {
        en: dto.description.en.trim(),
        fa: dto.description.fa?.trim(),
      },
      order,
    });
  }

  /**
   * Updates community service properties (title, description, order).
   */
  async update(
    id: string,
    dto: UpdateCommunityServiceDto,
  ): Promise<CommunityService> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    const service = await this.communityServiceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    if (dto.title) {
      service.title = {
        en: dto.title.en ? dto.title.en.trim() : service.title.en,
        fa:
          dto.title.fa !== undefined ? dto.title.fa?.trim() : service.title.fa,
      };
    }

    if (dto.description) {
      service.description = {
        en: dto.description.en
          ? dto.description.en.trim()
          : service.description.en,
        fa:
          dto.description.fa !== undefined
            ? dto.description.fa?.trim()
            : service.description.fa,
      };
    }

    if (dto.order !== undefined) {
      service.order = dto.order;
    }

    return service.save();
  }

  /**
   * Swaps order with adjacent community service in the requested direction.
   */
  async reorder(
    id: string,
    dto: ReorderCommunityServiceDto,
  ): Promise<CommunityService[]> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    const all = await this.communityServiceModel
      .find()
      .sort({ order: 1, createdAt: 1 })
      .exec();

    const i = all.findIndex((s) => s._id.toString() === id);
    if (i === -1) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_COMMUNITY_SERVICE'),
      );
    }

    if (dto.dir === ReorderDirection.DOWN && i === all.length - 1) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_COMMUNITY_SERVICE'),
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
      this.communityServiceModel.findByIdAndUpdate(all[i]._id, {
        order: orderJ,
      }),
      this.communityServiceModel.findByIdAndUpdate(all[j]._id, {
        order: orderI,
      }),
    ]);

    return this.communityServiceModel
      .find()
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Deletes a community service by id.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    const res = await this.communityServiceModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    return { success: true };
  }

  /**
   * Idempotently seeds the canonical 4 default community services if they do not yet exist.
   */
  async seed(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const s of DEFAULT_COMMUNITY_SERVICES) {
      const existing = await this.communityServiceModel.findOne({
        'title.en': s.title.en,
      });
      if (!existing) {
        await this.communityServiceModel.create({
          title: { en: s.title.en, fa: s.title.fa },
          description: { en: s.description.en, fa: s.description.fa },
          order: s.order,
        });
        seeded++;
      }
    }

    const total = await this.communityServiceModel.countDocuments();
    return { seeded, total };
  }
}

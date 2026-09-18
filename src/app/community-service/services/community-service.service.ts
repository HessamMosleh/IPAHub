import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import {
  CommunityService,
  CommunityServiceProp,
} from '../community-service.schema';
import { translate } from '../../../common/utils/translate';
import { ListCommunityServicesDto } from '../dtos/list-community-services.dto';
import { ICommunityServiceService } from '../interfaces/community-service-service.interface';

/**
 * Public/Client Community Service Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible community services listed on the home page.
 */
@Injectable()
export class CommunityServiceService implements ICommunityServiceService {
  constructor(
    @InjectModel(CommunityService.name)
    private readonly communityServiceModel: Model<CommunityService>,
  ) {}

  /**
   * Retrieves all community services sorted by display order ascending.
   * Optionally filters by search keyword across title and description (EN and FA).
   */
  async findAll(query?: ListCommunityServicesDto): Promise<CommunityService[]> {
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

    return this.communityServiceModel
      .find(filter)
      .select(CommunityServiceProp.general)
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Retrieves a single community service by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<CommunityService> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    const service = await this.communityServiceModel
      .findById(id)
      .select(CommunityServiceProp.general)
      .exec();

    if (!service) {
      throw new NotFoundException(
        translate('errors.COMMUNITY_SERVICE_NOT_FOUND'),
      );
    }

    return service;
  }
}

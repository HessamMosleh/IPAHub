import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { RequestType, RequestTypeProp } from '../request-type.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { resolveRequestPrice } from '../../document-request/utils/document-request-pricing.util';
import { ListRequestTypesDto } from '../dtos/list-request-types.dto';
import { IRequestTypeService } from '../interfaces/request-type-service.interface';

/**
 * Public/Client Request Type Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * and price resolution for publicly accessible, active request types.
 */
@Injectable()
export class RequestTypeService implements IRequestTypeService {
  constructor(
    @InjectModel(RequestType.name)
    private readonly requestTypeModel: Model<RequestType>,
  ) {}

  /**
   * Retrieves all active request types sorted by display order ascending.
   * Optionally filters by search keyword.
   */
  async findAllActive(query?: ListRequestTypesDto): Promise<RequestType[]> {
    const filter: QueryFilter<RequestType> = {
      status: ActiveStatus.ACTIVE,
    };

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

    return this.requestTypeModel
      .find(filter)
      .select(RequestTypeProp.client)
      .populate('prices.province', 'slug name')
      .sort({ order: 1, slug: 1 })
      .exec();
  }

  /**
   * Retrieves a single active request type by its slug.
   */
  async findBySlug(slug: string): Promise<RequestType> {
    const type = await this.requestTypeModel
      .findOne({
        slug: slug.toLowerCase().trim(),
        status: ActiveStatus.ACTIVE,
      })
      .select(RequestTypeProp.client)
      .populate('prices.province', 'slug name')
      .exec();

    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    return type;
  }

  /**
   * Retrieves a single active request type by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<RequestType> {
    const type = await this.requestTypeModel
      .findOne({ _id: id, status: ActiveStatus.ACTIVE })
      .select(RequestTypeProp.client)
      .populate('prices.province', 'slug name')
      .exec();

    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    return type;
  }

  /**
   * Resolves the applicable fee for this request type in a given province.
   */
  resolvePrice(type: RequestType, provinceId?: string): number {
    return resolveRequestPrice(type, provinceId);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  Province,
  ProvinceProp,
} from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { ListProvincesDto } from '../dtos/list-provinces.dto';
import { IProvinceService } from '../interfaces/province-service.interface';

/**
 * Public/Client Province Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible, active provinces.
 */
@Injectable()
export class ProvinceService implements IProvinceService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Retrieves all active provinces sorted by display order ascending.
   * Optionally filters by search keyword.
   */
  async findAllActive(query?: ListProvincesDto): Promise<Province[]> {
    const filter: QueryFilter<Province> = {
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

    return this.provinceModel
      .find(filter)
      .select(ProvinceProp.general)
      .sort({ order: 1, slug: 1 })
      .exec();
  }

  /**
   * Retrieves a single active province by its slug.
   */
  async findBySlug(slug: string): Promise<Province> {
    const province = await this.provinceModel
      .findOne({ slug: slug.toLowerCase().trim(), status: ActiveStatus.ACTIVE })
      .select(ProvinceProp.general)
      .exec();

    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    return province;
  }

  /**
   * Retrieves a single active province by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<Province> {
    const province = await this.provinceModel
      .findOne({ _id: id, status: ActiveStatus.ACTIVE })
      .select(ProvinceProp.general)
      .exec();

    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    return province;
  }
}

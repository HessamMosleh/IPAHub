import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { News, NewsProp, NewsStatus } from './news.schema';
import { ListNewsDto } from './dtos/list-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name) private readonly newsModel: Model<News>,
  ) {}

  async listNews(dto: ListNewsDto): Promise<{
    data: News[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<News> = {
      status: { $ne: NewsStatus.DELETED },
    };

    if (dto.province) {
      filter.province = new Types.ObjectId(dto.province);
    }

    // Build the createdAt range from the YYYY-MM-DD boundaries so the whole
    // day is covered on both ends (inclusive).
    const createdAt: QueryFilter<News>['createdAt'] = {};
    if (dto.fromDate) {
      createdAt.$gte = new Date(dto.fromDate);
    }
    if (dto.toDate) {
      const endOfDay = new Date(dto.toDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      createdAt.$lte = endOfDay;
    }
    if (createdAt.$gte || createdAt.$lte) {
      filter.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.newsModel
        .find(filter)
        .select(NewsProp.general)
        .populate('province')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.newsModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }
}

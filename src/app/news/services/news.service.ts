import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { News, NewsProp, NewsStatus } from '../news.schema';
import { translate } from '../../../common/utils/translate';
import { ListNewsDto } from '../dtos/list-news.dto';
import {
  INewsService,
  PaginatedNews,
} from '../interfaces/news-service.interface';

/**
 * Public/Client News Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible, active news posts.
 */
@Injectable()
export class NewsService implements INewsService {
  constructor(
    @InjectModel(News.name)
    private readonly newsModel: Model<News>,
  ) {}

  /**
   * Retrieves active, published news posts sorted by publication date descending.
   * Supports filtering by category, province, date range, and keyword search.
   */
  async findAll(query?: ListNewsDto): Promise<PaginatedNews> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<News> = {
      status: NewsStatus.ACTIVE,
    };

    if (query?.category) {
      filter.category = query.category;
    }

    if (query?.province && query.province.trim()) {
      if (isValidObjectId(query.province.trim())) {
        filter.province = new Types.ObjectId(query.province.trim());
      }
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'title.en': regex },
        { 'title.fa': regex },
        { 'subTitle.en': regex },
        { 'subTitle.fa': regex },
        { 'summery.en': regex },
        { 'summery.fa': regex },
        { 'byline.en': regex },
        { 'byline.fa': regex },
      ];
    }

    const publishedAtRange: QueryFilter<News>['publishedAt'] = {};
    if (query?.fromDate) {
      publishedAtRange.$gte = new Date(query.fromDate);
    }
    if (query?.toDate) {
      const endOfDay = new Date(query.toDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      publishedAtRange.$lte = endOfDay;
    }
    if (publishedAtRange.$gte || publishedAtRange.$lte) {
      filter.publishedAt = publishedAtRange;
    }

    const [data, total] = await Promise.all([
      this.newsModel
        .find(filter)
        .select(NewsProp.general)
        .populate('province', 'slug name')
        .populate('author', 'fullName latinFullName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.newsModel.countDocuments(filter).exec(),
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
   * Retrieves a single active, published news post by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<News> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    const news = await this.newsModel
      .findOne({ _id: id, status: NewsStatus.ACTIVE })
      .select(NewsProp.general)
      .populate('province', 'slug name')
      .populate('author', 'fullName latinFullName')
      .exec();

    if (!news) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    return news;
  }
}

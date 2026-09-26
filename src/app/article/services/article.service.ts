import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { Article, ArticleProp, ArticleStatus } from '../article.schema';
import { translate } from '../../../common/utils/translate';
import { ListArticleDto } from '../dtos/list-article.dto';
import {
  IArticleService,
  PaginatedArticles,
} from '../interfaces/article-service.interface';

/**
 * Public/Client Article Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible, active articles.
 */
@Injectable()
export class ArticleService implements IArticleService {
  constructor(
    @InjectModel(Article.name)
    private readonly articleModel: Model<Article>,
  ) {}

  /**
   * Retrieves active, published articles sorted by publication date descending.
   * Supports filtering by category, province, date range, and keyword search.
   */
  async findAll(query?: ListArticleDto): Promise<PaginatedArticles> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Article> = {
      status: ArticleStatus.ACTIVE,
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

    const publishedAtRange: QueryFilter<Article>['publishedAt'] = {};
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
      this.articleModel
        .find(filter)
        .select(ArticleProp.general)
        .populate('province', 'slug name')
        .populate('author', 'fullName latinFullName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
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
   * Retrieves a single active, published article by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<Article> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    const article = await this.articleModel
      .findOne({ _id: id, status: ArticleStatus.ACTIVE })
      .select(ArticleProp.general)
      .populate('province', 'slug name')
      .populate('author', 'fullName latinFullName')
      .exec();

    if (!article) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    return article;
  }
}

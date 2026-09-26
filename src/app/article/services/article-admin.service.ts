import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import {
  Article,
  ArticleCategory,
  ArticleProp,
  ArticleStatus,
} from '../article.schema';
import { Province } from '../../../common/schemas/province.schema';
import { UserRole } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { sanitizeHtml } from '../../../common/utils/sanitize-html.util';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AuthenticatedUser } from '../../auth/types';
import { AdminListArticleDto } from '../dtos/admin-list-article.dto';
import { CreateArticleDto } from '../dtos/create-article.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';
import {
  IArticleAdminService,
  PaginatedAdminArticles,
} from '../interfaces/article-admin-service.interface';

/**
 * Administrative Article Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, province-scoped access control,
 * write-time HTML sanitization, and publication lifecycle management.
 */
@Injectable()
export class ArticleAdminService implements IArticleAdminService {
  constructor(
    @InjectModel(Article.name)
    private readonly articleModel: Model<Article>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Lists articles with pagination, status filter, and optional admin-scope scoping.
   */
  async findAll(
    query?: AdminListArticleDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedAdminArticles> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Article> = {};

    const isSuper = this.isSuperAdmin(user);
    if (!isSuper) {
      const isProvinceAdmin = user?.roles?.includes(UserRole.PROVINCE_ADMIN);
      if (isProvinceAdmin && user?.managedProvinces?.length) {
        filter.category = ArticleCategory.PROVINCIAL;
        filter.province = {
          $in: user.managedProvinces.map((id) => new Types.ObjectId(id)),
        };
      } else {
        filter._id = null; // No authorized scope
      }
    }

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.category) {
      if (!isSuper && query.category === ArticleCategory.NATIONAL) {
        // Province admins cannot query national article in administrative view
        filter._id = null;
      } else {
        filter.category = query.category;
      }
    }

    if (query?.province && query.province.trim()) {
      if (isValidObjectId(query.province.trim())) {
        const provId = query.province.trim();
        if (!isSuper && !user?.managedProvinces?.includes(provId)) {
          throw new ForbiddenException(
            translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
          );
        }
        filter.province = new Types.ObjectId(provId);
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
        .select(ArticleProp.admin)
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
   * Retrieves any article by id, enforcing province-admin scoping.
   */
  async findById(id: string, user?: AuthenticatedUser): Promise<Article> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    const article = await this.articleModel
      .findById(id)
      .select(ArticleProp.admin)
      .populate('province', 'slug name')
      .populate('author', 'fullName latinFullName')
      .exec();

    if (!article) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    this.assertArticleScope(article, user);

    return article;
  }

  /**
   * Creates a new article with author assignment, province-scoping check,
   * and write-time rich text sanitization.
   */
  async create(
    dto: CreateArticleDto,
    user?: AuthenticatedUser,
  ): Promise<Article> {
    const isSuper = this.isSuperAdmin(user);
    if (!isSuper && dto.category === ArticleCategory.NATIONAL) {
      throw new ForbiddenException(
        translate('errors.CANNOT_CREATE_NATIONAL_ARTICLE'),
      );
    }
    const category = isSuper
      ? (dto.category ?? ArticleCategory.NATIONAL)
      : ArticleCategory.PROVINCIAL;

    let provinceId: string | undefined;

    if (category === ArticleCategory.PROVINCIAL) {
      provinceId = dto.province?.trim();
      if (!provinceId || !isValidObjectId(provinceId)) {
        throw new BadRequestException(
          translate('errors.PROVINCE_REQUIRED_FOR_PROVINCIAL_ARTICLE'),
        );
      }
      if (!isSuper) {
        if (!user?.managedProvinces?.includes(provinceId)) {
          throw new ForbiddenException(
            translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
          );
        }
      }
      const provinceExists = await this.provinceModel.exists({
        _id: new Types.ObjectId(provinceId),
      });
      if (!provinceExists) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }
    } else {
      if (!isSuper) {
        throw new ForbiddenException(
          translate('errors.CANNOT_CREATE_NATIONAL_ARTICLE'),
        );
      }
      provinceId = undefined;
    }

    let status = dto.status ?? ArticleStatus.REGISTERING;
    if (dto.published !== undefined && dto.status === undefined) {
      status = dto.published ? ArticleStatus.ACTIVE : ArticleStatus.REGISTERING;
    }

    let publishedAt = dto.publishedAt;
    if (!publishedAt) {
      publishedAt = new Date();
    }

    const title = {
      en: dto.title.en.trim(),
      fa: dto.title.fa?.trim() || undefined,
    };

    const subTitle = dto.subTitle
      ? {
          en: dto.subTitle.en.trim(),
          fa: dto.subTitle.fa?.trim() || undefined,
        }
      : undefined;

    const content = {
      en: sanitizeHtml(dto.content.en),
      fa: dto.content.fa ? sanitizeHtml(dto.content.fa) : undefined,
    };

    const summery = dto.summery
      ? {
          en: dto.summery.en.trim(),
          fa: dto.summery.fa?.trim() || undefined,
        }
      : undefined;

    const byline = dto.byline
      ? {
          en: dto.byline.en.trim(),
          fa: dto.byline.fa?.trim() || undefined,
        }
      : undefined;

    const image = toMediaFile(dto.image);

    const created = await this.articleModel.create({
      title,
      subTitle,
      content,
      summery,
      image,
      category,
      province: provinceId ? new Types.ObjectId(provinceId) : undefined,
      status,
      author:
        user?.id && isValidObjectId(user.id)
          ? new Types.ObjectId(user.id)
          : undefined,
      byline,
      publishedAt,
    });

    return this.findById(created._id.toString(), user);
  }

  /**
   * Updates an existing article, enforcing province-admin scoping on both
   * the existing post and any changed province target, with write-time HTML sanitization.
   */
  async update(
    id: string,
    dto: UpdateArticleDto,
    user?: AuthenticatedUser,
  ): Promise<Article> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    const article = await this.articleModel.findById(id).exec();
    if (!article) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    this.assertArticleScope(article, user);

    const isSuper = this.isSuperAdmin(user);

    // Determine target category
    let targetCategory = article.category;
    if (dto.category !== undefined) {
      if (!isSuper && dto.category === ArticleCategory.NATIONAL) {
        throw new ForbiddenException(
          translate('errors.CANNOT_CREATE_NATIONAL_ARTICLE'),
        );
      }
      targetCategory = dto.category;
    }

    // Determine target province
    if (targetCategory === ArticleCategory.PROVINCIAL) {
      const rawProv = article.province as
        Province | Types.ObjectId | string | undefined;
      let currentProvinceId: string | undefined;
      if (rawProv) {
        if (rawProv instanceof Types.ObjectId) {
          currentProvinceId = rawProv.toString();
        } else if (
          typeof rawProv === 'object' &&
          '_id' in rawProv &&
          rawProv._id
        ) {
          currentProvinceId = String(rawProv._id);
        } else if (typeof rawProv === 'string') {
          currentProvinceId = rawProv;
        }
      }

      const targetProvinceId: string | undefined =
        dto.province !== undefined ? dto.province?.trim() : currentProvinceId;

      if (!targetProvinceId || !isValidObjectId(targetProvinceId)) {
        throw new BadRequestException(
          translate('errors.PROVINCE_REQUIRED_FOR_PROVINCIAL_ARTICLE'),
        );
      }

      if (!isSuper && !user?.managedProvinces?.includes(targetProvinceId)) {
        throw new ForbiddenException(
          translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
        );
      }

      const provinceExists = await this.provinceModel.exists({
        _id: new Types.ObjectId(targetProvinceId),
      });
      if (!provinceExists) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }

      article.category = ArticleCategory.PROVINCIAL;
      article.province = new Types.ObjectId(
        targetProvinceId,
      ) as unknown as Province;
    } else {
      article.category = ArticleCategory.NATIONAL;
      article.province = undefined as unknown as Province;
    }

    if (dto.title) {
      article.title = {
        en: dto.title.en.trim(),
        fa: dto.title.fa?.trim() || undefined,
      };
    }

    if (dto.subTitle !== undefined) {
      article.subTitle = dto.subTitle
        ? {
            en: dto.subTitle.en.trim(),
            fa: dto.subTitle.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.content) {
      article.content = {
        en: sanitizeHtml(dto.content.en),
        fa: dto.content.fa ? sanitizeHtml(dto.content.fa) : undefined,
      };
    }

    if (dto.summery !== undefined) {
      article.summery = dto.summery
        ? {
            en: dto.summery.en.trim(),
            fa: dto.summery.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.byline !== undefined) {
      article.byline = dto.byline
        ? {
            en: dto.byline.en.trim(),
            fa: dto.byline.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.image !== undefined) {
      article.image = toMediaFile(dto.image);
    }

    let status = dto.status;
    if (dto.published !== undefined && dto.status === undefined) {
      status = dto.published ? ArticleStatus.ACTIVE : ArticleStatus.REGISTERING;
    }
    if (status !== undefined) {
      article.status = status;
      if (
        status === ArticleStatus.ACTIVE &&
        !article.publishedAt &&
        !dto.publishedAt
      ) {
        article.publishedAt = new Date();
      }
    }

    if (dto.publishedAt !== undefined) {
      article.publishedAt = dto.publishedAt;
    }

    await article.save();

    return this.findById(id, user);
  }

  /**
   * Soft-deletes an article by setting its status to DELETED.
   */
  async delete(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    const article = await this.articleModel.findById(id).exec();
    if (!article) {
      throw new NotFoundException(translate('errors.ARTICLE_NOT_FOUND'));
    }

    this.assertArticleScope(article, user);

    article.status = ArticleStatus.DELETED;
    await article.save();

    return { success: true };
  }

  /**
   * Asserts that if the user is a province-scoped admin, they are authorized
   * for the article's province.
   */
  private assertArticleScope(article: Article, user?: AuthenticatedUser): void {
    if (!user) return;
    if (this.isSuperAdmin(user)) return;

    const isProvinceAdmin = user.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (!isProvinceAdmin) {
      throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
    }

    if (article.category !== ArticleCategory.PROVINCIAL) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }

    const rawProv = article.province as
      Province | Types.ObjectId | string | undefined;
    let articleProvinceId: string | undefined;
    if (rawProv) {
      if (rawProv instanceof Types.ObjectId) {
        articleProvinceId = rawProv.toString();
      } else if (
        typeof rawProv === 'object' &&
        '_id' in rawProv &&
        rawProv._id
      ) {
        articleProvinceId = String(rawProv._id);
      } else if (typeof rawProv === 'string') {
        articleProvinceId = rawProv;
      }
    }

    if (
      !articleProvinceId ||
      !user.managedProvinces ||
      !user.managedProvinces.includes(articleProvinceId)
    ) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }
  }

  private isSuperAdmin(user?: AuthenticatedUser): boolean {
    return (
      user?.roles?.some(
        (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
      ) ?? false
    );
  }
}

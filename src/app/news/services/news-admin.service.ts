import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { News, NewsCategory, NewsProp, NewsStatus } from '../news.schema';
import { Province } from '../../../common/schemas/province.schema';
import { UserRole } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { sanitizeHtml } from '../../../common/utils/sanitize-html.util';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AuthenticatedUser } from '../../auth/types';
import { AdminListNewsDto } from '../dtos/admin-list-news.dto';
import { CreateNewsDto } from '../dtos/create-news.dto';
import { UpdateNewsDto } from '../dtos/update-news.dto';
import {
  INewsAdminService,
  PaginatedAdminNews,
} from '../interfaces/news-admin-service.interface';

/**
 * Administrative News Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, province-scoped access control,
 * write-time HTML sanitization, and publication lifecycle management.
 */
@Injectable()
export class NewsAdminService implements INewsAdminService {
  constructor(
    @InjectModel(News.name)
    private readonly newsModel: Model<News>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Lists news posts with pagination, status filter, and optional admin-scope scoping.
   */
  async findAll(
    query?: AdminListNewsDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedAdminNews> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<News> = {};

    const isSuper = this.isSuperAdmin(user);
    if (!isSuper) {
      const isProvinceAdmin = user?.roles?.includes(UserRole.PROVINCE_ADMIN);
      if (isProvinceAdmin && user?.managedProvinces?.length) {
        filter.category = NewsCategory.PROVINCIAL;
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
      if (!isSuper && query.category === NewsCategory.NATIONAL) {
        // Province admins cannot query national news in administrative view
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
        .select(NewsProp.admin)
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
   * Retrieves any news post by id, enforcing province-admin scoping.
   */
  async findById(id: string, user?: AuthenticatedUser): Promise<News> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    const news = await this.newsModel
      .findById(id)
      .select(NewsProp.admin)
      .populate('province', 'slug name')
      .populate('author', 'fullName latinFullName')
      .exec();

    if (!news) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    this.assertNewsScope(news, user);

    return news;
  }

  /**
   * Creates a new news post with author assignment, province-scoping check,
   * and write-time rich text sanitization.
   */
  async create(dto: CreateNewsDto, user?: AuthenticatedUser): Promise<News> {
    const isSuper = this.isSuperAdmin(user);
    if (!isSuper && dto.category === NewsCategory.NATIONAL) {
      throw new ForbiddenException(
        translate('errors.CANNOT_CREATE_NATIONAL_NEWS'),
      );
    }
    const category = isSuper
      ? (dto.category ?? NewsCategory.NATIONAL)
      : NewsCategory.PROVINCIAL;

    let provinceId: string | undefined;

    if (category === NewsCategory.PROVINCIAL) {
      provinceId = dto.province?.trim();
      if (!provinceId || !isValidObjectId(provinceId)) {
        throw new BadRequestException(
          translate('errors.PROVINCE_REQUIRED_FOR_PROVINCIAL_NEWS'),
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
          translate('errors.CANNOT_CREATE_NATIONAL_NEWS'),
        );
      }
      provinceId = undefined;
    }

    let status = dto.status ?? NewsStatus.REGISTERING;
    if (dto.published !== undefined && dto.status === undefined) {
      status = dto.published ? NewsStatus.ACTIVE : NewsStatus.REGISTERING;
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

    const created = await this.newsModel.create({
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
   * Updates an existing news post, enforcing province-admin scoping on both
   * the existing post and any changed province target, with write-time HTML sanitization.
   */
  async update(
    id: string,
    dto: UpdateNewsDto,
    user?: AuthenticatedUser,
  ): Promise<News> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    this.assertNewsScope(news, user);

    const isSuper = this.isSuperAdmin(user);

    // Determine target category
    let targetCategory = news.category;
    if (dto.category !== undefined) {
      if (!isSuper && dto.category === NewsCategory.NATIONAL) {
        throw new ForbiddenException(
          translate('errors.CANNOT_CREATE_NATIONAL_NEWS'),
        );
      }
      targetCategory = dto.category;
    }

    // Determine target province
    if (targetCategory === NewsCategory.PROVINCIAL) {
      const rawProv = news.province as
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
          translate('errors.PROVINCE_REQUIRED_FOR_PROVINCIAL_NEWS'),
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

      news.category = NewsCategory.PROVINCIAL;
      news.province = new Types.ObjectId(
        targetProvinceId,
      ) as unknown as Province;
    } else {
      news.category = NewsCategory.NATIONAL;
      news.province = undefined as unknown as Province;
    }

    if (dto.title) {
      news.title = {
        en: dto.title.en.trim(),
        fa: dto.title.fa?.trim() || undefined,
      };
    }

    if (dto.subTitle !== undefined) {
      news.subTitle = dto.subTitle
        ? {
            en: dto.subTitle.en.trim(),
            fa: dto.subTitle.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.content) {
      news.content = {
        en: sanitizeHtml(dto.content.en),
        fa: dto.content.fa ? sanitizeHtml(dto.content.fa) : undefined,
      };
    }

    if (dto.summery !== undefined) {
      news.summery = dto.summery
        ? {
            en: dto.summery.en.trim(),
            fa: dto.summery.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.byline !== undefined) {
      news.byline = dto.byline
        ? {
            en: dto.byline.en.trim(),
            fa: dto.byline.fa?.trim() || undefined,
          }
        : undefined;
    }

    if (dto.image !== undefined) {
      news.image = toMediaFile(dto.image);
    }

    let status = dto.status;
    if (dto.published !== undefined && dto.status === undefined) {
      status = dto.published ? NewsStatus.ACTIVE : NewsStatus.REGISTERING;
    }
    if (status !== undefined) {
      news.status = status;
      if (
        status === NewsStatus.ACTIVE &&
        !news.publishedAt &&
        !dto.publishedAt
      ) {
        news.publishedAt = new Date();
      }
    }

    if (dto.publishedAt !== undefined) {
      news.publishedAt = dto.publishedAt;
    }

    await news.save();

    return this.findById(id, user);
  }

  /**
   * Soft-deletes a news post by setting its status to DELETED.
   */
  async delete(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException(translate('errors.NEWS_NOT_FOUND'));
    }

    this.assertNewsScope(news, user);

    news.status = NewsStatus.DELETED;
    await news.save();

    return { success: true };
  }

  /**
   * Asserts that if the user is a province-scoped admin, they are authorized
   * for the news post's province.
   */
  private assertNewsScope(news: News, user?: AuthenticatedUser): void {
    if (!user) return;
    if (this.isSuperAdmin(user)) return;

    const isProvinceAdmin = user.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (!isProvinceAdmin) {
      throw new ForbiddenException(translate('errors.FORBIDDEN_RESOURCE'));
    }

    if (news.category !== NewsCategory.PROVINCIAL) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }

    const rawProv = news.province as
      Province | Types.ObjectId | string | undefined;
    let newsProvinceId: string | undefined;
    if (rawProv) {
      if (rawProv instanceof Types.ObjectId) {
        newsProvinceId = rawProv.toString();
      } else if (
        typeof rawProv === 'object' &&
        '_id' in rawProv &&
        rawProv._id
      ) {
        newsProvinceId = String(rawProv._id);
      } else if (typeof rawProv === 'string') {
        newsProvinceId = rawProv;
      }
    }

    if (
      !newsProvinceId ||
      !user.managedProvinces ||
      !user.managedProvinces.includes(newsProvinceId)
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

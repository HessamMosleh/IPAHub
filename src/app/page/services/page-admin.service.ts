import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { Page, PageKey, PageProp } from '../page.schema';
import { translate } from '../../../common/utils/translate';
import { sanitizeHtml } from '../../../common/utils/sanitize-html.util';
import { AdminListPagesDto } from '../dtos/admin-list-pages.dto';
import { CreatePageDto } from '../dtos/create-page.dto';
import { UpdatePageDto } from '../dtos/update-page.dto';
import { SavePageDto } from '../dtos/save-page.dto';
import { DEFAULT_PAGES, PAGE_KEYS } from '../constants/default-pages';
import {
  IPageAdminService,
  PaginatedPages,
} from '../interfaces/page-admin-service.interface';

/**
 * Administrative Page Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, rich-text HTML sanitization on write,
 * image replacement/removal, upsert operations, and canonical seeding.
 */
@Injectable()
export class PageAdminService implements IPageAdminService {
  constructor(
    @InjectModel(Page.name)
    private readonly pageModel: Model<Page>,
  ) {}

  /**
   * Lists pages with pagination and search filter.
   */
  async findAll(query?: AdminListPagesDto): Promise<PaginatedPages> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Page> = {};

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { key: regex },
        { 'title.en': regex },
        { 'title.fa': regex },
        { 'body.en': regex },
        { 'body.fa': regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.pageModel
        .find(filter)
        .select(PageProp.admin)
        .sort({ key: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.pageModel.countDocuments(filter).exec(),
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
   * Retrieves a page by its key (e.g. 'about-forum').
   */
  async findByKey(key: PageKey | string): Promise<Page> {
    const normalizedKey = key.toLowerCase().trim() as PageKey;

    const page = await this.pageModel
      .findOne({ key: normalizedKey })
      .select(PageProp.admin)
      .exec();

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    return page;
  }

  /**
   * Retrieves a page by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<Page> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    const page = await this.pageModel
      .findById(id)
      .select(PageProp.admin)
      .exec();

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    return page;
  }

  /**
   * Upserts or saves a page by key (creates if not found, updates if found).
   * Sanitizes rich-text HTML on write.
   * Preserves current image on text-only edits unless removeImage is true or a new image is provided.
   */
  async save(key: PageKey | string, dto: SavePageDto): Promise<Page> {
    const normalizedKey = key.toLowerCase().trim() as PageKey;
    if (!PAGE_KEYS.includes(normalizedKey)) {
      throw new BadRequestException(translate('errors.INVALID_PAGE_KEY'));
    }

    const existing = await this.pageModel
      .findOne({ key: normalizedKey })
      .exec();

    const title = dto.title
      ? {
          en: dto.title.en ? dto.title.en.trim() : (existing?.title?.en ?? ''),
          fa:
            dto.title.fa !== undefined
              ? dto.title.fa.trim()
              : existing?.title?.fa,
        }
      : (existing?.title ?? { en: '' });

    const body = dto.body
      ? {
          en:
            dto.body.en !== undefined
              ? sanitizeHtml(dto.body.en)
              : (existing?.body?.en ?? ''),
          fa:
            dto.body.fa !== undefined
              ? dto.body.fa
                ? sanitizeHtml(dto.body.fa)
                : undefined
              : existing?.body?.fa,
        }
      : (existing?.body ?? { en: '' });

    if (existing) {
      existing.title = title;
      existing.body = body;

      if (dto.removeImage) {
        existing.image = undefined;
      } else if (dto.image !== undefined) {
        existing.image = dto.image;
      }

      return existing.save();
    }

    return this.pageModel.create({
      key: normalizedKey,
      title,
      body,
      image: dto.removeImage ? undefined : dto.image,
    });
  }

  /**
   * Creates a new page.
   */
  async create(dto: CreatePageDto): Promise<Page> {
    const normalizedKey = dto.key.toLowerCase().trim() as PageKey;
    if (!PAGE_KEYS.includes(normalizedKey)) {
      throw new BadRequestException(translate('errors.INVALID_PAGE_KEY'));
    }

    const existing = await this.pageModel
      .findOne({ key: normalizedKey })
      .exec();
    if (existing) {
      throw new ConflictException(translate('errors.PAGE_KEY_EXISTS'));
    }

    const title = {
      en: dto.title.en.trim(),
      fa: dto.title.fa?.trim(),
    };

    const body = {
      en: sanitizeHtml(dto.body.en),
      fa: dto.body.fa ? sanitizeHtml(dto.body.fa) : undefined,
    };

    return this.pageModel.create({
      key: normalizedKey,
      title,
      body,
      image: dto.image,
    });
  }

  /**
   * Updates an existing page by key.
   */
  async update(key: PageKey | string, dto: UpdatePageDto): Promise<Page> {
    const normalizedKey = key.toLowerCase().trim() as PageKey;
    const page = await this.pageModel.findOne({ key: normalizedKey }).exec();

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    if (dto.title) {
      page.title = {
        en: dto.title.en ? dto.title.en.trim() : page.title.en,
        fa: dto.title.fa !== undefined ? dto.title.fa.trim() : page.title.fa,
      };
    }

    if (dto.body) {
      page.body = {
        en:
          dto.body.en !== undefined ? sanitizeHtml(dto.body.en) : page.body.en,
        fa:
          dto.body.fa !== undefined
            ? dto.body.fa
              ? sanitizeHtml(dto.body.fa)
              : undefined
            : page.body.fa,
      };
    }

    if (dto.removeImage) {
      page.image = undefined;
    } else if (dto.image !== undefined) {
      page.image = dto.image;
    }

    return page.save();
  }

  /**
   * Idempotently seeds the 6 canonical static pages with default content.
   */
  async seed(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const p of DEFAULT_PAGES) {
      const res = await this.pageModel.updateOne(
        { key: p.key },
        {
          $setOnInsert: {
            key: p.key,
            title: p.title,
            body: {
              en: sanitizeHtml(p.body.en),
              fa: p.body.fa ? sanitizeHtml(p.body.fa) : undefined,
            },
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        seeded++;
      }
    }

    const total = await this.pageModel.countDocuments().exec();
    return { seeded, total };
  }

  /**
   * Deletes a page by key or ObjectId.
   */
  async delete(key: PageKey | string): Promise<{ success: boolean }> {
    let page: Page | null = null;

    if (isValidObjectId(key)) {
      page = await this.pageModel.findById(key).exec();
    }

    if (!page) {
      const normalizedKey = key.toLowerCase().trim() as PageKey;
      page = await this.pageModel.findOne({ key: normalizedKey }).exec();
    }

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    await this.pageModel.findByIdAndDelete(page._id).exec();
    return { success: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { Page, PageKey, PageProp } from '../page.schema';
import { translate } from '../../../common/utils/translate';
import { ListPagesDto } from '../dtos/list-pages.dto';
import { IPageService } from '../interfaces/page-service.interface';

/**
 * Public/Client Page Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible static CMS pages (e.g. about-forum, goals, memorandum).
 */
@Injectable()
export class PageService implements IPageService {
  constructor(
    @InjectModel(Page.name)
    private readonly pageModel: Model<Page>,
  ) {}

  /**
   * Retrieves all static pages sorted by key ascending.
   * Optionally filters by search keyword across key, title, and body (EN & FA).
   */
  async findAll(query?: ListPagesDto): Promise<Page[]> {
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

    return this.pageModel
      .find(filter)
      .select(PageProp.general)
      .sort({ key: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Retrieves a single page by its key (e.g. 'about-forum', 'goals').
   * Throws NotFoundException if not found.
   */
  async findByKey(key: PageKey | string): Promise<Page> {
    const normalizedKey = key.toLowerCase().trim() as PageKey;

    const page = await this.pageModel
      .findOne({ key: normalizedKey })
      .select(PageProp.general)
      .exec();

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    return page;
  }

  /**
   * Retrieves a single page by its MongoDB ObjectId.
   * Throws NotFoundException if invalid id or not found.
   */
  async findById(id: string): Promise<Page> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    const page = await this.pageModel
      .findById(id)
      .select(PageProp.general)
      .exec();

    if (!page) {
      throw new NotFoundException(translate('errors.PAGE_NOT_FOUND'));
    }

    return page;
  }
}

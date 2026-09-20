import { Page, PageKey } from '../page.schema';
import { AdminListPagesDto } from '../dtos/admin-list-pages.dto';
import { CreatePageDto } from '../dtos/create-page.dto';
import { UpdatePageDto } from '../dtos/update-page.dto';
import { SavePageDto } from '../dtos/save-page.dto';

export interface PaginatedPages {
  data: Page[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative page operations.
 * Segregated from the public client interface (ISP).
 */
export interface IPageAdminService {
  /**
   * Lists pages with pagination and optional search filter.
   */
  findAll(query?: AdminListPagesDto): Promise<PaginatedPages>;

  /**
   * Retrieves a page by its key (e.g. 'about-forum').
   * Throws NotFoundException if not found.
   */
  findByKey(key: PageKey | string): Promise<Page>;

  /**
   * Retrieves a page by its MongoDB ObjectId.
   * Throws NotFoundException if not found.
   */
  findById(id: string): Promise<Page>;

  /**
   * Upserts or saves a page by its key (creates if not found, updates if found).
   * Sanitizes rich-text body and handles image attachment/removal.
   */
  save(key: PageKey | string, dto: SavePageDto): Promise<Page>;

  /**
   * Creates a new page.
   */
  create(dto: CreatePageDto): Promise<Page>;

  /**
   * Updates an existing page by key.
   */
  update(key: PageKey | string, dto: UpdatePageDto): Promise<Page>;

  /**
   * Idempotently seeds the 6 canonical static pages with default content.
   */
  seed(): Promise<{ seeded: number; total: number }>;

  /**
   * Deletes a page by key or ObjectId.
   */
  delete(key: PageKey | string): Promise<{ success: boolean }>;
}

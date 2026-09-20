import { Page, PageKey } from '../page.schema';
import { ListPagesDto } from '../dtos/list-pages.dto';

/**
 * Contract for public/client page queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for public pages.
 */
export interface IPageService {
  /**
   * Returns all static pages, optionally filtered by search keyword,
   * sorted by key ascending.
   */
  findAll(query?: ListPagesDto): Promise<Page[]>;

  /**
   * Finds a single page by its key (e.g. 'about-forum').
   * Throws NotFoundException if not found or invalid key.
   */
  findByKey(key: PageKey | string): Promise<Page>;

  /**
   * Finds a single page by its MongoDB ObjectId.
   * Throws NotFoundException if not found.
   */
  findById(id: string): Promise<Page>;
}

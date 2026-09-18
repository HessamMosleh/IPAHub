import { News } from '../news.schema';
import { ListNewsDto } from '../dtos/list-news.dto';

export interface PaginatedNews {
  data: News[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public/Client News Service Contract.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for active, published news.
 */
export interface INewsService {
  /**
   * Retrieves active, published news posts with pagination, category,
   * province, date filters, and keyword search.
   */
  findAll(query?: ListNewsDto): Promise<PaginatedNews>;

  /**
   * Finds a single active news post by its MongoDB ObjectId.
   * Throws NotFoundException if not found or inactive.
   */
  findById(id: string): Promise<News>;
}

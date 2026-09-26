import { Article } from '../article.schema';
import { ListArticleDto } from '../dtos/list-article.dto';

export interface PaginatedArticles {
  data: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public/Client Article Service Contract.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for active, published article.
 */
export interface IArticleService {
  /**
   * Retrieves active, published articles with pagination, category,
   * province, date filters, and keyword search.
   */
  findAll(query?: ListArticleDto): Promise<PaginatedArticles>;

  /**
   * Finds a single active article by its MongoDB ObjectId.
   * Throws NotFoundException if not found or inactive.
   */
  findById(id: string): Promise<Article>;
}

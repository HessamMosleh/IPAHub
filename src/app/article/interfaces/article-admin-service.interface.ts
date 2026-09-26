import { Article } from '../article.schema';
import { AdminListArticleDto } from '../dtos/admin-list-article.dto';
import { CreateArticleDto } from '../dtos/create-article.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface PaginatedAdminArticles {
  data: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative Article Service Contract.
 * Segregated from the public client interface (ISP).
 * Encapsulates administrative queries, mutations, HTML sanitization,
 * and province-scoped access control.
 */
export interface IArticleAdminService {
  /**
   * Lists articles with pagination, status, category, province, and search filters,
   * scoped to the admin's managed provinces if applicable.
   */
  findAll(
    query?: AdminListArticleDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedAdminArticles>;

  /**
   * Retrieves any article by id, enforcing province-admin scoping.
   */
  findById(id: string, user?: AuthenticatedUser): Promise<Article>;

  /**
   * Creates a new article with author assignment, province-scoping check,
   * and write-time rich text sanitization.
   */
  create(dto: CreateArticleDto, user?: AuthenticatedUser): Promise<Article>;

  /**
   * Updates an existing article, enforcing province-admin scoping on both
   * the existing post and any changed province target, with write-time HTML sanitization.
   */
  update(
    id: string,
    dto: UpdateArticleDto,
    user?: AuthenticatedUser,
  ): Promise<Article>;

  /**
   * Soft-deletes an article by setting its status to DELETED.
   */
  delete(id: string, user?: AuthenticatedUser): Promise<{ success: boolean }>;
}

import { News } from '../news.schema';
import { AdminListNewsDto } from '../dtos/admin-list-news.dto';
import { CreateNewsDto } from '../dtos/create-news.dto';
import { UpdateNewsDto } from '../dtos/update-news.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface PaginatedAdminNews {
  data: News[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative News Service Contract.
 * Segregated from the public client interface (ISP).
 * Encapsulates administrative queries, mutations, HTML sanitization,
 * and province-scoped access control.
 */
export interface INewsAdminService {
  /**
   * Lists news posts with pagination, status, category, province, and search filters,
   * scoped to the admin's managed provinces if applicable.
   */
  findAll(
    query?: AdminListNewsDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedAdminNews>;

  /**
   * Retrieves any news post by id, enforcing province-admin scoping.
   */
  findById(id: string, user?: AuthenticatedUser): Promise<News>;

  /**
   * Creates a new news post with author assignment, province-scoping check,
   * and write-time rich text sanitization.
   */
  create(dto: CreateNewsDto, user?: AuthenticatedUser): Promise<News>;

  /**
   * Updates an existing news post, enforcing province-admin scoping on both
   * the existing post and any changed province target, with write-time HTML sanitization.
   */
  update(
    id: string,
    dto: UpdateNewsDto,
    user?: AuthenticatedUser,
  ): Promise<News>;

  /**
   * Soft-deletes a news post by setting its status to DELETED.
   */
  delete(id: string, user?: AuthenticatedUser): Promise<{ success: boolean }>;
}

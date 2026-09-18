import { CommunityService } from '../community-service.schema';
import { AdminListCommunityServicesDto } from '../dtos/admin-list-community-services.dto';
import { CreateCommunityServiceDto } from '../dtos/create-community-service.dto';
import { UpdateCommunityServiceDto } from '../dtos/update-community-service.dto';
import { ReorderCommunityServiceDto } from '../dtos/reorder-community-service.dto';

export interface PaginatedCommunityServices {
  data: CommunityService[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative community service operations.
 * Segregated from the public client interface (ISP).
 */
export interface ICommunityServiceAdminService {
  /**
   * Lists community services with pagination and search filter.
   */
  findAll(
    query?: AdminListCommunityServicesDto,
  ): Promise<PaginatedCommunityServices>;

  /**
   * Retrieves any community service by its MongoDB ObjectId.
   */
  findById(id: string): Promise<CommunityService>;

  /**
   * Creates a new community service.
   */
  create(dto: CreateCommunityServiceDto): Promise<CommunityService>;

  /**
   * Updates community service properties (title, description, order).
   */
  update(id: string, dto: UpdateCommunityServiceDto): Promise<CommunityService>;

  /**
   * Swaps order with adjacent community service in the requested direction.
   */
  reorder(
    id: string,
    dto: ReorderCommunityServiceDto,
  ): Promise<CommunityService[]>;

  /**
   * Deletes a community service by id.
   */
  delete(id: string): Promise<{ success: boolean }>;

  /**
   * Idempotently seeds the canonical default community services if they do not yet exist.
   */
  seed(): Promise<{ seeded: number; total: number }>;
}

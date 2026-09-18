import { CommunityService } from '../community-service.schema';
import { ListCommunityServicesDto } from '../dtos/list-community-services.dto';

/**
 * Contract for public/client community service queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for public community services.
 */
export interface ICommunityServiceService {
  /**
   * Retrieves all community services ordered ascending by display order.
   * Optionally filters by search keyword.
   */
  findAll(query?: ListCommunityServicesDto): Promise<CommunityService[]>;

  /**
   * Finds a single community service by its MongoDB ObjectId.
   * Throws NotFoundException if not found.
   */
  findById(id: string): Promise<CommunityService>;
}

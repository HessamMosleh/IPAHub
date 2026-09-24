import { RequestType } from '../request-type.schema';
import { ListRequestTypesDto } from '../dtos/list-request-types.dto';

/**
 * Contract for public/client request type queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for active request types.
 */
export interface IRequestTypeService {
  /**
   * Returns all active request types, optionally filtered by keyword,
   * sorted by display order ascending.
   */
  findAllActive(query?: ListRequestTypesDto): Promise<RequestType[]>;

  /**
   * Finds a single active request type by its unique slug.
   * Throws NotFoundException if not found or inactive.
   */
  findBySlug(slug: string): Promise<RequestType>;

  /**
   * Finds a single active request type by its MongoDB ObjectId.
   * Throws NotFoundException if not found or inactive.
   */
  findById(id: string): Promise<RequestType>;

  /**
   * Resolves the applicable fee in Rials for this request type in a given province.
   */
  resolvePrice(type: RequestType, provinceId?: string): number;
}

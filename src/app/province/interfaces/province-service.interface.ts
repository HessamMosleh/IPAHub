import { Province } from '../../../common/schemas/province.schema';
import { ListProvincesDto } from '../dtos/list-provinces.dto';

/**
 * Contract for public/client province queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for active provinces.
 */
export interface IProvinceService {
  /**
   * Returns all active provinces, optionally filtered by keyword,
   * sorted by display order ascending.
   */
  findAllActive(query?: ListProvincesDto): Promise<Province[]>;

  /**
   * Finds a single active province by its slug.
   * Throws NotFoundException if not found or inactive.
   */
  findBySlug(slug: string): Promise<Province>;

  /**
   * Finds a single active province by its MongoDB ObjectId.
   * Throws NotFoundException if not found or inactive.
   */
  findById(id: string): Promise<Province>;
}

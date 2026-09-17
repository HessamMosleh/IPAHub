import { Province } from '../../../common/schemas/province.schema';
import { AdminListProvincesDto } from '../dtos/admin-list-provinces.dto';
import { CreateProvinceDto } from '../dtos/create-province.dto';
import { UpdateProvinceDto } from '../dtos/update-province.dto';
import { UpdateProvinceSocialsDto } from '../dtos/update-province-socials.dto';
import { ReorderProvinceDto } from '../dtos/reorder-province.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface PaginatedProvinces {
  data: Province[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative province operations.
 * Segregated from the public client interface (ISP).
 */
export interface IProvinceAdminService {
  /**
   * Lists provinces with pagination, status filter, and optional admin-scope scoping.
   */
  findAll(
    query?: AdminListProvincesDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedProvinces>;

  /**
   * Retrieves any province by id, enforcing province-admin scoping if applicable.
   */
  findById(id: string, user?: AuthenticatedUser): Promise<Province>;

  /**
   * Creates a new province with unique slug check.
   */
  create(dto: CreateProvinceDto): Promise<Province>;

  /**
   * Updates province properties (slug, name, status, order).
   */
  update(id: string, dto: UpdateProvinceDto): Promise<Province>;

  /**
   * Updates social links for a province, with URL and phone normalization.
   * Permitted for SUPER_ADMIN, ADMIN, or PROVINCE_ADMIN scoped to this province.
   */
  updateSocials(
    id: string,
    dto: UpdateProvinceSocialsDto,
    user?: AuthenticatedUser,
  ): Promise<Province>;

  /**
   * Swaps order with adjacent province in the requested direction.
   */
  reorder(id: string, dto: ReorderProvinceDto): Promise<Province[]>;

  /**
   * Disables (soft-deletes) or removes a province.
   */
  delete(id: string): Promise<{ success: boolean }>;

  /**
   * Idempotently seeds the canonical 32 provinces if they do not yet exist.
   */
  seed(): Promise<{ seeded: number; total: number }>;
}

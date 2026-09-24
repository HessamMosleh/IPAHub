import { RequestType } from '../request-type.schema';
import { AdminListRequestTypesDto } from '../dtos/admin-list-request-types.dto';
import { CreateRequestTypeDto } from '../dtos/create-request-type.dto';
import { UpdateRequestTypeDto } from '../dtos/update-request-type.dto';
import { SetRequestTypeProvincePricesDto } from '../dtos/set-request-type-province-prices.dto';
import { ReorderRequestTypeDto } from '../dtos/reorder-request-type.dto';

export interface PaginatedRequestTypes {
  data: RequestType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative request type operations.
 * Segregated from the public client interface (ISP).
 */
export interface IRequestTypeAdminService {
  /**
   * Lists request types with pagination, status filter, and optional search.
   */
  findAll(query?: AdminListRequestTypesDto): Promise<PaginatedRequestTypes>;

  /**
   * Retrieves any request type by id, including inactive ones, with populated prices.
   */
  findById(id: string): Promise<RequestType>;

  /**
   * Creates a new request type. If slug is omitted, auto-generates a unique one from name.en.
   */
  create(dto: CreateRequestTypeDto): Promise<RequestType>;

  /**
   * Updates request type properties (name, description, baseFee, producesDocument, order, status, slug).
   */
  update(id: string, dto: UpdateRequestTypeDto): Promise<RequestType>;

  /**
   * Replaces or updates per-province price overrides for this request type.
   */
  setProvincePrices(
    id: string,
    dto: SetRequestTypeProvincePricesDto,
  ): Promise<RequestType>;

  /**
   * Swaps order with adjacent request type in the requested direction.
   */
  reorder(id: string, dto: ReorderRequestTypeDto): Promise<RequestType[]>;

  /**
   * Deletes a request type: soft-deletes (disables) if referenced in document requests;
   * hard-deletes if unreferenced. System-fulfilled card slug cannot be deleted.
   */
  delete(id: string): Promise<{ success: boolean; softDeleted: boolean }>;

  /**
   * Idempotently seeds canonical request types without overwriting custom fees.
   */
  seed(): Promise<{ seeded: number; total: number }>;
}

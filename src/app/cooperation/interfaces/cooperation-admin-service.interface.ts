import { CooperationRequest } from '../cooperation-request.schema';
import { AdminListCooperationRequestsDto } from '../dtos/admin-list-cooperation-requests.dto';
import { DeclineCooperationRequestDto } from '../dtos/decline-cooperation-request.dto';

export interface PaginatedCooperationRequests {
  data: CooperationRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative cooperation operations.
 * Segregated from the member client interface (ISP).
 */
export interface ICooperationAdminService {
  /**
   * Lists cooperation requests with pagination, status, province, and search filters.
   */
  findAll(
    query?: AdminListCooperationRequestsDto,
  ): Promise<PaginatedCooperationRequests>;

  /**
   * Retrieves any cooperation request by id with populated member and province details.
   */
  findById(id: string): Promise<CooperationRequest>;

  /**
   * Accepts a pending cooperation request. Refuses already-decided requests.
   */
  accept(id: string): Promise<CooperationRequest>;

  /**
   * Declines a pending cooperation request with a required reason. Refuses already-decided requests.
   */
  decline(
    id: string,
    dto: DeclineCooperationRequestDto,
  ): Promise<CooperationRequest>;

  /**
   * Deletes a cooperation request by id.
   */
  delete(id: string): Promise<{ success: boolean }>;
}

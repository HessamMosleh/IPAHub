import { CooperationRequest } from '../cooperation-request.schema';
import { CreateCooperationRequestDto } from '../dtos/create-cooperation-request.dto';
import { ListCooperationRequestsDto } from '../dtos/list-cooperation-requests.dto';

export interface PaginatedUserCooperationRequests {
  data: CooperationRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for member/client cooperation operations.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see proposal submission and retrieving their own requests.
 */
export interface ICooperationService {
  /**
   * Submits a new cooperation proposal for an active approved member.
   * Validates membership status and ensures no open PENDING request exists.
   */
  create(
    dto: CreateCooperationRequestDto,
    userId: string,
  ): Promise<CooperationRequest>;

  /**
   * Retrieves the authenticated member's submitted cooperation requests.
   */
  findAllByUser(
    userId: string,
    query?: ListCooperationRequestsDto,
  ): Promise<PaginatedUserCooperationRequests>;

  /**
   * Retrieves a specific cooperation request belonging to the authenticated member.
   */
  findByIdAndUser(id: string, userId: string): Promise<CooperationRequest>;
}

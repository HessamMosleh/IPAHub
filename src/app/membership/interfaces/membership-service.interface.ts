import { MembershipRequest } from '../schemas/membership-request.schema';
import { SubmitMembershipRequestDto } from '../dtos/submit-membership-request.dto';
import { ListMembershipRequestsDto } from '../dtos/list-membership-requests.dto';
import { MembershipOptionsResponseDto } from '../dtos/membership-option-response.dto';

export interface PaginatedUserMembershipRequests {
  data: MembershipRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for member/client membership operations.
 * Adheres to Interface Segregation Principle (ISP) — client consumers only see
 * viewing tiers, applying, renewing, and reviewing their own requests. No
 * pricing, approval, or fee configuration leaks in.
 */
export interface IMembershipService {
  /**
   * The membership overview for a member: applicable tiers with their copy, a
   * live cost quote each, and the member's current standing.
   */
  getOptions(userId: string): Promise<MembershipOptionsResponseDto>;

  /**
   * Submits a new application (or tier change). Validates profile completeness,
   * required documents, the tier's form fields, and open-request eligibility.
   * Fees are NOT quoted here — that happens at admin approval.
   */
  apply(
    dto: SubmitMembershipRequestDto,
    userId: string,
  ): Promise<MembershipRequest>;

  /**
   * Self-serve renewal of the member's current tier. Creates a billable request
   * directly (no admin vetting); activates immediately when the fee is zero.
   */
  renew(userId: string): Promise<MembershipRequest>;

  /** Lists the member's own membership requests. */
  findAllByUser(
    userId: string,
    query?: ListMembershipRequestsDto,
  ): Promise<PaginatedUserMembershipRequests>;

  /** Retrieves one of the member's own membership requests. */
  findByIdAndUser(id: string, userId: string): Promise<MembershipRequest>;
}

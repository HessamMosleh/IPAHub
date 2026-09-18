import { MembershipRequest } from '../schemas/membership-request.schema';
import { MembershipFee } from '../schemas/membership-fee.schema';
import { MembershipTypeInfo } from '../schemas/membership-type-info.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { AuthenticatedUser } from '../../auth/types';
import { AdminListMembershipRequestsDto } from '../dtos/admin-list-membership-requests.dto';
import { RejectMembershipRequestDto } from '../dtos/reject-membership-request.dto';
import { MarkPaidMembershipRequestDto } from '../dtos/mark-paid-membership-request.dto';
import { UpdateMembershipFeeDto } from '../dtos/update-membership-fee.dto';
import { SetProvincePricesDto } from '../dtos/set-province-prices.dto';
import { UpdateMembershipTypeInfoDto } from '../dtos/update-membership-type-info.dto';

export interface PaginatedMembershipRequests {
  data: MembershipRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative membership operations.
 * Segregated from the member client interface (ISP): request review, fee
 * configuration, and tier copy management.
 */
export interface IMembershipAdminService {
  /** Lists membership requests with pagination, filters, and province scoping. */
  findAllRequests(
    query?: AdminListMembershipRequestsDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedMembershipRequests>;

  /** Retrieves any membership request by id, enforcing province scope. */
  findRequestById(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<MembershipRequest>;

  /**
   * Approves a pending application: quotes at approval time, snapshots the bill,
   * and either moves it to awaiting-payment or activates it when nothing is owed.
   */
  approve(id: string, user?: AuthenticatedUser): Promise<MembershipRequest>;

  /** Rejects a pending application with an optional reason. */
  reject(
    id: string,
    dto: RejectMembershipRequestDto,
    user?: AuthenticatedUser,
  ): Promise<MembershipRequest>;

  /**
   * Confirms an offline payment for an awaiting-payment request: records the
   * payment in the ledger and activates the membership.
   */
  markPaid(
    id: string,
    dto: MarkPaidMembershipRequestDto,
    admin: AuthenticatedUser,
  ): Promise<MembershipRequest>;

  /** Lists every tier's fee configuration. */
  findAllFees(): Promise<MembershipFee[]>;

  /** Sets a tier's national base and entrance fees. */
  updateFee(
    type: MembershipType,
    dto: UpdateMembershipFeeDto,
  ): Promise<MembershipFee>;

  /** Replaces a tier's per-province fee overrides. */
  setProvincePrices(
    type: MembershipType,
    dto: SetProvincePricesDto,
  ): Promise<MembershipFee>;

  /** Lists every tier's member-facing copy. */
  findAllTypeInfo(): Promise<MembershipTypeInfo[]>;

  /** Upserts a tier's member-facing copy (summary + rights). */
  saveTypeInfo(
    type: MembershipType,
    dto: UpdateMembershipTypeInfoDto,
  ): Promise<MembershipTypeInfo>;

  /** Idempotently seeds a fee row and info row for every membership tier. */
  seed(): Promise<{ fees: number; typeInfos: number }>;
}

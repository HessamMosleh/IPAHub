import { DocumentRequest } from '../document-request.schema';
import { AdminListDocumentRequestsDto } from '../dtos/admin-list-document-requests.dto';
import { RejectDocumentRequestDto } from '../dtos/reject-document-request.dto';
import { FulfillDocumentRequestDto } from '../dtos/fulfill-document-request.dto';
import { MarkPaidDocumentRequestDto } from '../dtos/mark-paid-document-request.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface PaginatedAdminDocumentRequests {
  data: DocumentRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative Document Request Service Contract.
 * Segregated from the member client interface (ISP).
 * Provides review, decision, fulfillment, offline payment, and management operations.
 */
export interface IDocumentRequestAdminService {
  /**
   * Lists document requests with pagination, status, request type, province,
   * search, and attention filters, enforcing province-admin scoping where applicable.
   */
  findAll(
    query?: AdminListDocumentRequestsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminDocumentRequests>;

  /**
   * Retrieves any document request by its MongoDB ObjectId, enforcing province scope.
   */
  findById(id: string, admin?: AuthenticatedUser): Promise<DocumentRequest>;

  /**
   * Accepts a pending document request, moving status to ACCEPTED and setting
   * paymentStatus to PENDING (if fee > 0) or NONE.
   */
  accept(id: string, admin?: AuthenticatedUser): Promise<DocumentRequest>;

  /**
   * Rejects a pending document request with an optional or required reason.
   */
  reject(
    id: string,
    dto: RejectDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest>;

  /**
   * Fulfills an accepted, settled document request with an issued file (or directly if non-document).
   */
  fulfill(
    id: string,
    dto: FulfillDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest>;

  /**
   * Confirms an offline payment (cash, bank transfer, receipt) for an accepted document request bill,
   * stamps paymentStatus as PAID, and logs a single-source-of-truth ledger entry in Payment.
   */
  markPaid(
    id: string,
    dto: MarkPaidDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest>;

  /**
   * Deletes a document request.
   */
  delete(id: string, admin?: AuthenticatedUser): Promise<{ success: boolean }>;
}

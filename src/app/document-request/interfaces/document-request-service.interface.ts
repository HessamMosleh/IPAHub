import { DocumentRequest } from '../document-request.schema';
import { CreateDocumentRequestDto } from '../dtos/create-document-request.dto';
import { ListDocumentRequestsDto } from '../dtos/list-document-requests.dto';
import { DocumentRequestOptionsResponseDto } from '../dtos/document-request-options-response.dto';

export interface PaginatedUserDocumentRequests {
  data: DocumentRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public/Member Client Document Request Service Contract.
 * Adheres to Interface Segregation Principle (ISP) —
 * provides member-facing self-service capabilities only.
 */
export interface IDocumentRequestService {
  /**
   * Returns available document request options with live member-specific pricing
   * and card eligibility blocker states.
   */
  getOptions(userId: string): Promise<DocumentRequestOptionsResponseDto>;

  /**
   * Submits a new document request as an active member, snapshotting province price
   * and verifying card eligibility if requesting a membership card.
   */
  create(
    dto: CreateDocumentRequestDto,
    userId: string,
  ): Promise<DocumentRequest>;

  /**
   * Lists the authenticated member's own submitted document requests with pagination.
   */
  findAllByUser(
    userId: string,
    query?: ListDocumentRequestsDto,
  ): Promise<PaginatedUserDocumentRequests>;

  /**
   * Retrieves a single document request owned by the authenticated member.
   */
  findByIdAndUser(id: string, userId: string): Promise<DocumentRequest>;
}

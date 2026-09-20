import { MemberFeedback } from '../member-feedback.schema';
import { AdminListFeedbackDto } from '../dtos/admin-list-feedback.dto';
import { PaginatedFeedback } from './feedback-service.interface';

/**
 * Administrative Feedback Service contract.
 * Segregated from the member client interface (ISP) — encapsulates
 * inbox querying, resolving/unresolving messages, deletion, and open counts.
 */
export interface IFeedbackAdminService {
  /**
   * Lists feedback messages with pagination, resolved status filter, and sender/content search.
   * Unresolved messages appear first, followed by descending creation time.
   */
  findAll(query?: AdminListFeedbackDto): Promise<PaginatedFeedback>;

  /**
   * Retrieves a single feedback message by id with sender user populated.
   * Throws NotFoundException if not found.
   */
  findById(id: string): Promise<MemberFeedback>;

  /**
   * Marks a feedback message as resolved.
   * Throws NotFoundException if not found.
   */
  resolve(id: string): Promise<MemberFeedback>;

  /**
   * Reopens a resolved feedback message (marks as unresolved).
   * Throws NotFoundException if not found.
   */
  unresolve(id: string): Promise<MemberFeedback>;

  /**
   * Permanently deletes a feedback message by id.
   * Throws NotFoundException if not found.
   */
  delete(id: string): Promise<{ success: boolean }>;

  /**
   * Returns the count of unresolved (open) feedback messages.
   */
  countUnresolved(): Promise<{ count: number }>;
}

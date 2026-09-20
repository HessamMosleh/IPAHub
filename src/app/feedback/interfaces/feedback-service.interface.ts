import { MemberFeedback } from '../member-feedback.schema';
import { CreateFeedbackDto } from '../dtos/create-feedback.dto';
import { ListFeedbackDto } from '../dtos/list-feedback.dto';

export interface PaginatedFeedback {
  data: MemberFeedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Public/Client Member Feedback Service contract.
 * Adheres to Interface Segregation Principle (ISP) — member consumers
 * only see operations for submitting feedback and reviewing their own submissions.
 */
export interface IFeedbackService {
  /**
   * Submits a new feedback message from an active member.
   * Throws ForbiddenException if member is not active.
   */
  create(dto: CreateFeedbackDto, userId: string): Promise<MemberFeedback>;

  /**
   * Retrieves paginated feedback messages submitted by the specified member.
   */
  findAllByUser(
    userId: string,
    query?: ListFeedbackDto,
  ): Promise<PaginatedFeedback>;

  /**
   * Retrieves a single feedback message by id owned by the specified member.
   * Throws NotFoundException if not found or belongs to another user.
   */
  findByIdAndUser(id: string, userId: string): Promise<MemberFeedback>;
}

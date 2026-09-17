import { Person } from '../../person/person.schema';
import { BoardTerm } from '../board-term.schema';
import { AddBoardMemberDto } from '../dtos/add-board-member.dto';
import { AdminListBoardTermsDto } from '../dtos/admin-list-board-terms.dto';
import { CreateBoardTermDto } from '../dtos/create-board-term.dto';
import { ReorderBoardMemberDto } from '../dtos/reorder-board-member.dto';
import { UpdateBoardMemberDto } from '../dtos/update-board-member.dto';
import { UpdateBoardTermDto } from '../dtos/update-board-term.dto';

export interface PaginatedBoardTerms {
  data: BoardTerm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative Board Service contract.
 * Segregated from the public client interface (ISP).
 * Handles mutations, singleton constraints, chronology validation, and membership management.
 */
export interface IBoardAdminService {
  /**
   * Retrieves paginated board terms sorted newest first (order desc).
   */
  findAll(query?: AdminListBoardTermsDto): Promise<PaginatedBoardTerms>;

  /**
   * Retrieves a single board term with populated members by MongoDB ObjectId.
   */
  findById(id: string): Promise<BoardTerm>;

  /**
   * Creates a new board term with unique order, date bounds, overlap, and chronology checks.
   */
  create(dto: CreateBoardTermDto): Promise<BoardTerm>;

  /**
   * Updates an existing board term with overlap and chronology validation.
   */
  update(id: string, dto: UpdateBoardTermDto): Promise<BoardTerm>;

  /**
   * Deletes a board term and cascades to its embedded memberships.
   */
  delete(id: string): Promise<{ success: boolean }>;

  /**
   * Adds a person to a board term.
   * Enforces:
   * - Person must exist and have role === 'board'
   * - Person cannot already be in this term
   * - Singleton position cannot already be held by another member in this term
   */
  addMember(termId: string, dto: AddBoardMemberDto): Promise<BoardTerm>;

  /**
   * Updates an existing member's position or sort order within a term.
   * Enforces singleton uniqueness (excluding self).
   */
  updateMember(
    termId: string,
    memberId: string,
    dto: UpdateBoardMemberDto,
  ): Promise<BoardTerm>;

  /**
   * Removes a member from a board term.
   */
  removeMember(termId: string, memberId: string): Promise<BoardTerm>;

  /**
   * Swaps sort order with adjacent member in the requested direction.
   */
  reorderMember(
    termId: string,
    memberId: string,
    dto: ReorderBoardMemberDto,
  ): Promise<BoardTerm>;

  /**
   * Returns list of eligible personnel (role = 'board') not yet added to this term.
   */
  getEligiblePeople(termId: string): Promise<Person[]>;
}

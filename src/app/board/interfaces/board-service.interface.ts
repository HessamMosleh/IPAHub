import { BoardPosition, BoardTerm } from '../board-term.schema';
import { ListBoardTermsDto } from '../dtos/list-board-terms.dto';

export interface BoardTermSummary {
  _id: string;
  order: number;
  name: any;
  startsAt: Date;
  endsAt?: Date | null;
  memberCount: number;
  isCurrent: boolean;
}

export interface BoardMemberView {
  _id?: string;
  person: any;
  position: BoardPosition;
  order: number;
}

export interface PublicBoardView {
  selectedTerm?: BoardTerm | null;
  terms: BoardTermSummary[];
  members: BoardMemberView[];
  isLegacy: boolean;
}

export interface BoardServiceItem {
  termId: string;
  termOrder: number;
  termName: any;
  position: BoardPosition;
}

export interface BoardStandingResult {
  current: Record<string, string>;
  former: string[];
}

/**
 * Public/Client Board Service contract.
 * Adheres to Interface Segregation Principle (ISP) — exposes read-only
 * operations for public board terms, board view composition, and member history.
 */
export interface IBoardService {
  /**
   * Retrieves all board terms ordered descending by term sequence (newest first).
   */
  findAllTerms(query?: ListBoardTermsDto): Promise<BoardTerm[]>;

  /**
   * Retrieves the current sitting board term (highest order that has members, or highest order).
   */
  findCurrentTerm(): Promise<BoardTerm | null>;

  /**
   * Retrieves a single board term by its sequence order number.
   * Throws NotFoundException if not found.
   */
  findByOrder(order: number): Promise<BoardTerm>;

  /**
   * Retrieves a single board term by MongoDB ObjectId.
   * Throws NotFoundException if not found.
   */
  findById(id: string): Promise<BoardTerm>;

  /**
   * Composes the full public board view:
   * - Resolves the selected term (from query parameter or current term default)
   * - Populates members sorted by position hierarchy
   * - Scopes active status filter to current term only (preserves historical term records)
   * - Falls back to pre-terms legacy board members if no terms exist
   */
  getBoardView(termParam?: string | number): Promise<PublicBoardView>;

  /**
   * Returns all terms a person served on the board, newest first.
   * Used on the public person detail profile page.
   */
  getBoardServiceForPerson(personId: string): Promise<BoardServiceItem[]>;

  /**
   * Computes the current board standing across all personnel:
   * - current: personId -> position slug in current term
   * - former: personIds who served in past terms but not currently
   */
  getBoardStanding(): Promise<BoardStandingResult>;
}

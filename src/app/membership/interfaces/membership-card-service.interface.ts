import { MembershipCard } from '../schemas/membership-card.schema';
import { CardSide } from '../utils/membership-card-svg.util';

export interface IMembershipCardService {
  /**
   * Generates and snapshots a membership card for a paid, accepted document request,
   * then marks the request COMPLETED.
   *
   * Returns null when the request is not ready, not a card type, or already issued.
   * Throws BadRequestException when prerequisite member data (photo, name, tier) is missing.
   */
  issueCard(
    requestId: string,
    opts?: { force?: boolean },
  ): Promise<MembershipCard | null>;

  /**
   * Retrieves the issued card corresponding to a document request.
   */
  findByRequestId(requestId: string): Promise<MembershipCard | null>;

  /**
   * Lists all historical cards issued to a specific user.
   */
  findByUserId(userId: string): Promise<MembershipCard[]>;

  /**
   * Finds the latest issued active card for a user.
   */
  findLatestByUserId(userId: string): Promise<MembershipCard | null>;

  /**
   * Finds a card by ID scoped to a specific user.
   */
  findByIdForUser(id: string, userId: string): Promise<MembershipCard | null>;

  /**
   * Retrieves a card by its MongoDB ObjectId.
   */
  findById(id: string): Promise<MembershipCard | null>;

  /**
   * Retrieves all issued cards (admin view).
   */
  findAll(): Promise<MembershipCard[]>;

  /**
   * Generates pure SVG markup for the front or back of an issued card.
   */
  getCardSvg(requestId: string, side: CardSide): Promise<string>;
}

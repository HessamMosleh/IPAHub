import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { BoardTerm, BoardTermProp } from '../board-term.schema';
import { Person, PersonProp, PersonRole } from '../../person/person.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { ListBoardTermsDto } from '../dtos/list-board-terms.dto';
import {
  BoardServiceItem,
  BoardStandingResult,
  BoardTermSummary,
  IBoardService,
  PublicBoardView,
} from '../interfaces/board-service.interface';
import {
  defaultTerm,
  resolveTerm,
  sortBoardMembers,
} from '../utils/board.util';

/**
 * Public/Client Board Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for the public board view, historical terms, and person board service credentials.
 */
@Injectable()
export class BoardService implements IBoardService {
  constructor(
    @InjectModel(BoardTerm.name)
    private readonly boardTermModel: Model<BoardTerm>,
    @InjectModel(Person.name)
    private readonly personModel: Model<Person>,
  ) {}

  /**
   * Retrieves all board terms ordered descending (newest first).
   * Populates member personnel and sorts by positional hierarchy.
   */
  async findAllTerms(query?: ListBoardTermsDto): Promise<BoardTerm[]> {
    const filter: QueryFilter<BoardTerm> = {};

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ 'name.en': regex }, { 'name.fa': regex }];
    }

    const terms = await this.boardTermModel
      .find(filter)
      .select(BoardTermProp.general)
      .populate({
        path: 'members.person',
        select: PersonProp.general,
      })
      .sort({ order: -1 })
      .exec();

    terms.forEach((term) => {
      if (term.members && term.members.length > 0) {
        term.members = sortBoardMembers(term.members);
      }
    });

    return terms;
  }

  /**
   * Retrieves the current sitting board term.
   */
  async findCurrentTerm(): Promise<BoardTerm | null> {
    const terms = await this.findAllTerms();
    return defaultTerm(terms) ?? null;
  }

  /**
   * Retrieves a single board term by sequence order.
   */
  async findByOrder(order: number): Promise<BoardTerm> {
    const term = await this.boardTermModel
      .findOne({ order })
      .select(BoardTermProp.general)
      .populate({
        path: 'members.person',
        select: PersonProp.general,
      })
      .exec();

    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    if (term.members && term.members.length > 0) {
      term.members = sortBoardMembers(term.members);
    }

    return term;
  }

  /**
   * Retrieves a single board term by MongoDB ObjectId.
   */
  async findById(id: string): Promise<BoardTerm> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const term = await this.boardTermModel
      .findById(id)
      .select(BoardTermProp.general)
      .populate({
        path: 'members.person',
        select: PersonProp.general,
      })
      .exec();

    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    if (term.members && term.members.length > 0) {
      term.members = sortBoardMembers(term.members);
    }

    return term;
  }

  /**
   * Composes the full public board view for client display.
   */
  async getBoardView(termParam?: string | number): Promise<PublicBoardView> {
    const allTerms = await this.findAllTerms();

    // If no board terms exist in the database, fall back to legacy board members
    if (!allTerms || allTerms.length === 0) {
      const legacyPeople = await this.personModel
        .find({
          role: PersonRole.BOARD,
          status: ActiveStatus.ACTIVE,
        })
        .select(PersonProp.general)
        .sort({ order: 1, createdAt: 1 })
        .exec();

      return {
        selectedTerm: null,
        terms: [],
        members: legacyPeople.map((p) => ({
          _id: p._id.toString(),
          person: p,
          position: '' as any,
          order: p.order,
        })),
        isLegacy: true,
      };
    }

    const current = defaultTerm(allTerms);
    const selected = resolveTerm(allTerms, termParam, current);

    const termSummaries: BoardTermSummary[] = allTerms.map((t) => ({
      _id: t._id.toString(),
      order: t.order,
      name: t.name,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      memberCount: t.members?.length ?? 0,
      isCurrent: t.order === current?.order,
    }));

    if (!selected) {
      return {
        selectedTerm: null,
        terms: termSummaries,
        members: [],
        isLegacy: false,
      };
    }

    const isCurrent = selected.order === current?.order;

    // Filter members: active status is enforced only on the current sitting term.
    // Historical term rosters preserve member records even if a person is inactive.
    let members = selected.members || [];
    if (isCurrent) {
      members = members.filter(
        (m) =>
          m.person &&
          ((m.person as any).status === undefined ||
            (m.person as any).status === ActiveStatus.ACTIVE),
      );
    }

    members = sortBoardMembers(members);

    return {
      selectedTerm: selected,
      terms: termSummaries,
      members: members.map((m) => ({
        _id: (m as any)._id?.toString(),
        person: m.person,
        position: m.position,
        order: m.order,
      })),
      isLegacy: false,
    };
  }

  /**
   * Returns all board terms a person served on, sorted newest first.
   */
  async getBoardServiceForPerson(
    personId: string,
  ): Promise<BoardServiceItem[]> {
    if (!isValidObjectId(personId)) {
      return [];
    }

    const pId = new Types.ObjectId(personId);
    const terms = await this.boardTermModel
      .find({ 'members.person': pId } as any)
      .select(BoardTermProp.general)
      .sort({ order: -1 })
      .exec();

    const serviceList: BoardServiceItem[] = [];

    for (const term of terms) {
      const membership = term.members.find((m) => {
        if (!m.person) return false;
        const id =
          (m.person as any)._id?.toString() || (m.person as any).toString();
        return id === personId;
      });
      if (membership) {
        serviceList.push({
          termId: term._id.toString(),
          termOrder: term.order,
          termName: term.name,
          position: membership.position,
        });
      }
    }

    return serviceList;
  }

  /**
   * Computes the current board standing across all members.
   */
  async getBoardStanding(): Promise<BoardStandingResult> {
    const terms = await this.boardTermModel
      .find()
      .select(BoardTermProp.general)
      .sort({ order: -1 })
      .exec();

    const currentTerm = defaultTerm(terms);
    const current: Record<string, string> = {};
    const served = new Set<string>();

    if (currentTerm && currentTerm.members) {
      for (const m of currentTerm.members) {
        if (m.person) {
          const personId =
            (m.person as any)._id?.toString() || (m.person as any).toString();
          if (personId) {
            current[personId] = m.position;
          }
        }
      }
    }

    for (const term of terms) {
      if (term.members) {
        for (const m of term.members) {
          if (m.person) {
            const personId =
              (m.person as any)._id?.toString() || (m.person as any).toString();
            if (personId) {
              served.add(personId);
            }
          }
        }
      }
    }

    const former = Array.from(served).filter((id) => !current[id]);

    return { current, former };
  }
}

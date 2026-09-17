import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { BoardTerm, BoardTermProp } from '../board-term.schema';
import { Person, PersonProp, PersonRole } from '../../person/person.schema';
import { translate } from '../../../common/utils/translate';
import { AddBoardMemberDto } from '../dtos/add-board-member.dto';
import { AdminListBoardTermsDto } from '../dtos/admin-list-board-terms.dto';
import { CreateBoardTermDto } from '../dtos/create-board-term.dto';
import {
  ReorderBoardMemberDto,
  ReorderDirection,
} from '../dtos/reorder-board-member.dto';
import { UpdateBoardMemberDto } from '../dtos/update-board-member.dto';
import { UpdateBoardTermDto } from '../dtos/update-board-term.dto';
import {
  IBoardAdminService,
  PaginatedBoardTerms,
} from '../interfaces/board-admin-service.interface';
import {
  findChronologyConflict,
  findOverlappingTerm,
  isSingletonBoardPosition,
  sortBoardMembers,
} from '../utils/board.util';

/**
 * Administrative Board Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates board term lifecycle, calendar chronology, date overlap constraints,
 * and singleton position enforcement.
 */
@Injectable()
export class BoardAdminService implements IBoardAdminService {
  constructor(
    @InjectModel(BoardTerm.name)
    private readonly boardTermModel: Model<BoardTerm>,
    @InjectModel(Person.name)
    private readonly personModel: Model<Person>,
  ) {}

  /**
   * Retrieves paginated board terms with search filter, sorted newest first.
   */
  async findAll(query?: AdminListBoardTermsDto): Promise<PaginatedBoardTerms> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<BoardTerm> = {};

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ 'name.en': regex }, { 'name.fa': regex }];
    }

    const [data, total] = await Promise.all([
      this.boardTermModel
        .find(filter)
        .select(BoardTermProp.admin)
        .populate({
          path: 'members.person',
          select: PersonProp.general,
        })
        .sort({ order: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.boardTermModel.countDocuments(filter).exec(),
    ]);

    data.forEach((term) => {
      if (term.members && term.members.length > 0) {
        term.members = sortBoardMembers(term.members);
      }
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves a single board term with populated members by id.
   */
  async findById(id: string): Promise<BoardTerm> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const term = await this.boardTermModel
      .findById(id)
      .select(BoardTermProp.admin)
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
   * Creates a new board term after validating order uniqueness, date bounds,
   * date overlap, and chronology.
   */
  async create(dto: CreateBoardTermDto): Promise<BoardTerm> {
    const existingOrder = await this.boardTermModel.findOne({
      order: dto.order,
    });
    if (existingOrder) {
      throw new ConflictException(translate('errors.BOARD_TERM_ORDER_EXISTS'));
    }

    if (dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException(
        translate('errors.INVALID_BOARD_TERM_DATES'),
      );
    }

    const existingTerms = await this.boardTermModel
      .find()
      .select('order startsAt endsAt')
      .exec();

    const candidateSpan = {
      order: dto.order,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt ?? null,
    };

    const overlap = findOverlappingTerm(candidateSpan, existingTerms);
    if (overlap) {
      throw new ConflictException(translate('errors.BOARD_TERM_DATES_OVERLAP'));
    }

    const chronology = findChronologyConflict(candidateSpan, existingTerms);
    if (chronology) {
      throw new BadRequestException(
        translate('errors.BOARD_TERM_CHRONOLOGY_CONFLICT'),
      );
    }

    return this.boardTermModel.create({
      name: {
        en: dto.name.en.trim(),
        fa: dto.name.fa?.trim(),
      },
      order: dto.order,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      members: [],
    });
  }

  /**
   * Updates an existing board term with date bounds, overlap, and chronology validation.
   */
  async update(id: string, dto: UpdateBoardTermDto): Promise<BoardTerm> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(id).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    if (dto.order !== undefined && dto.order !== term.order) {
      const existingOrder = await this.boardTermModel.findOne({
        order: dto.order,
      });
      if (existingOrder) {
        throw new ConflictException(
          translate('errors.BOARD_TERM_ORDER_EXISTS'),
        );
      }
    }

    const candidateOrder = dto.order !== undefined ? dto.order : term.order;
    const candidateStartsAt =
      dto.startsAt !== undefined ? dto.startsAt : term.startsAt;
    const candidateEndsAt = dto.endsAt !== undefined ? dto.endsAt : term.endsAt;

    if (
      candidateEndsAt &&
      new Date(candidateEndsAt) <= new Date(candidateStartsAt)
    ) {
      throw new BadRequestException(
        translate('errors.INVALID_BOARD_TERM_DATES'),
      );
    }

    const existingTerms = await this.boardTermModel
      .find()
      .select('order startsAt endsAt')
      .exec();

    const candidateSpan = {
      order: candidateOrder,
      startsAt: candidateStartsAt,
      endsAt: candidateEndsAt ?? null,
    };

    const overlap = findOverlappingTerm(candidateSpan, existingTerms, id);
    if (overlap) {
      throw new ConflictException(translate('errors.BOARD_TERM_DATES_OVERLAP'));
    }

    const chronology = findChronologyConflict(candidateSpan, existingTerms, id);
    if (chronology) {
      throw new BadRequestException(
        translate('errors.BOARD_TERM_CHRONOLOGY_CONFLICT'),
      );
    }

    if (dto.name) {
      term.name = {
        en: dto.name.en ? dto.name.en.trim() : term.name.en,
        fa: dto.name.fa !== undefined ? dto.name.fa.trim() : term.name.fa,
      };
    }

    if (dto.order !== undefined) {
      term.order = dto.order;
    }

    if (dto.startsAt !== undefined) {
      term.startsAt = dto.startsAt;
    }

    if (dto.endsAt !== undefined) {
      term.endsAt = dto.endsAt;
    }

    await term.save();
    return this.findById(id);
  }

  /**
   * Deletes a board term and cascades to embedded memberships.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(id).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    await this.boardTermModel.findByIdAndDelete(id).exec();
    return { success: true };
  }

  /**
   * Adds a person with BOARD role to a term, enforcing singleton constraints and non-duplication.
   */
  async addMember(termId: string, dto: AddBoardMemberDto): Promise<BoardTerm> {
    if (!isValidObjectId(termId)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }
    if (!isValidObjectId(dto.person)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(termId).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const person = await this.personModel.findById(dto.person).exec();
    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    if (person.role !== PersonRole.BOARD) {
      throw new BadRequestException(
        translate('errors.PERSON_MUST_HAVE_BOARD_ROLE'),
      );
    }

    const alreadyMember = term.members.some((m) => {
      const id =
        (m.person as any)?._id?.toString() || (m.person as any)?.toString();
      return id === dto.person;
    });
    if (alreadyMember) {
      throw new ConflictException(
        translate('errors.BOARD_MEMBER_ALREADY_EXISTS'),
      );
    }

    if (isSingletonBoardPosition(dto.position)) {
      const positionTaken = term.members.some(
        (m) => m.position === dto.position,
      );
      if (positionTaken) {
        throw new ConflictException(translate('errors.BOARD_POSITION_TAKEN'));
      }
    }

    let memberOrder = dto.order;
    if (memberOrder === undefined || memberOrder === null) {
      const highest = term.members
        .filter((m) => m.position === dto.position)
        .reduce((max, curr) => Math.max(max, curr.order ?? 0), 0);
      memberOrder = highest > 0 ? highest + 1 : 0;
    }

    term.members.push({
      person: new Types.ObjectId(dto.person) as any,
      position: dto.position,
      order: memberOrder,
    });

    await term.save();
    return this.findById(termId);
  }

  /**
   * Updates an existing board member's position or sort order, enforcing singleton uniqueness.
   */
  async updateMember(
    termId: string,
    memberId: string,
    dto: UpdateBoardMemberDto,
  ): Promise<BoardTerm> {
    if (!isValidObjectId(termId)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }
    if (!isValidObjectId(memberId)) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(termId).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const member = term.members.find(
      (m) => (m as any)._id?.toString() === memberId,
    );
    if (!member) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    if (dto.position && dto.position !== member.position) {
      if (isSingletonBoardPosition(dto.position)) {
        const positionTaken = term.members.some(
          (m) =>
            (m as any)._id?.toString() !== memberId &&
            m.position === dto.position,
        );
        if (positionTaken) {
          throw new ConflictException(translate('errors.BOARD_POSITION_TAKEN'));
        }
      }
      member.position = dto.position;
    }

    if (dto.order !== undefined) {
      member.order = dto.order;
    }

    await term.save();
    return this.findById(termId);
  }

  /**
   * Removes a member from a board term.
   */
  async removeMember(termId: string, memberId: string): Promise<BoardTerm> {
    if (!isValidObjectId(termId)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }
    if (!isValidObjectId(memberId)) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(termId).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const initialLength = term.members.length;
    term.members = term.members.filter(
      (m) => (m as any)._id?.toString() !== memberId,
    );

    if (term.members.length === initialLength) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    await term.save();
    return this.findById(termId);
  }

  /**
   * Reorders a member moving up or down within their position group.
   */
  async reorderMember(
    termId: string,
    memberId: string,
    dto: ReorderBoardMemberDto,
  ): Promise<BoardTerm> {
    if (!isValidObjectId(termId)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }
    if (!isValidObjectId(memberId)) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(termId).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const targetMember = term.members.find(
      (m) => (m as any)._id?.toString() === memberId,
    );
    if (!targetMember) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    const group = term.members
      .filter((m) => m.position === targetMember.position)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const i = group.findIndex((m) => (m as any)._id?.toString() === memberId);
    if (i === -1) {
      throw new NotFoundException(translate('errors.BOARD_MEMBER_NOT_FOUND'));
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_BOARD_MEMBER'),
      );
    }

    if (dto.dir === ReorderDirection.DOWN && i === group.length - 1) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_BOARD_MEMBER'),
      );
    }

    const j = dto.dir === ReorderDirection.UP ? i - 1 : i + 1;

    let orderI = group[i].order ?? 0;
    let orderJ = group[j].order ?? 0;

    if (orderI === orderJ) {
      orderI = i;
      orderJ = j;
    }

    group[i].order = orderJ;
    group[j].order = orderI;

    await term.save();
    return this.findById(termId);
  }

  /**
   * Retrieves all personnel with BOARD role not yet attached to the given term.
   */
  async getEligiblePeople(termId: string): Promise<Person[]> {
    if (!isValidObjectId(termId)) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const term = await this.boardTermModel.findById(termId).exec();
    if (!term) {
      throw new NotFoundException(translate('errors.BOARD_TERM_NOT_FOUND'));
    }

    const takenPersonIds = (term.members || [])
      .map(
        (m) =>
          (m.person as any)?._id?.toString() || (m.person as any)?.toString(),
      )
      .filter(Boolean)
      .map((id) => new Types.ObjectId(id));

    return this.personModel
      .find({
        role: PersonRole.BOARD,
        _id: { $nin: takenPersonIds },
      } as any)
      .select(PersonProp.general)
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }
}

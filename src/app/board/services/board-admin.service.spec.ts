import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BoardAdminService } from './board-admin.service';
import { BoardPosition, BoardTerm } from '../board-term.schema';
import { Person, PersonRole } from '../../person/person.schema';
import {
  buildAddMemberDto,
  buildBoardTermModelMock,
  buildCreateTermDto,
  buildMember,
  buildPerson,
  buildPersonModelMock,
  buildQueryChain,
  buildTerm,
  FIXED_PERSON_ID,
  FIXED_TERM_ID,
  newObjectId,
} from './__test-helpers__/board-test-fixtures';

describe('BoardAdminService', () => {
  let service: BoardAdminService;
  let mockBoardTermModel: ReturnType<typeof buildBoardTermModelMock>;
  let mockPersonModel: ReturnType<typeof buildPersonModelMock>;

  // Independence: fresh mocks for every test. The previous version shared
  // a single mock instance, so a `mockReturnValue` in one test silently
  // affected the next one — a classic F.I.R.S.T independence violation.
  beforeEach(async () => {
    mockBoardTermModel = buildBoardTermModelMock();
    mockPersonModel = buildPersonModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardAdminService,
        {
          provide: getModelToken(BoardTerm.name),
          useValue: mockBoardTermModel,
        },
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
      ],
    }).compile();

    service = module.get<BoardAdminService>(BoardAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // Helper: configure a `findById` mock that returns a freshly-built term
  // every call, so the post-mutation `this.findById()` re-read the same
  // logical term. This replaces the order-coupled `mockReturnValueOnce`
  // chain the previous version used.
  const stubTermById = (termOverrides: any = {}) => {
    const term = buildTerm(termOverrides);
    mockBoardTermModel.findById.mockReturnValue(buildQueryChain(term));
    return term;
  };

  const stubPersonById = (personOverrides: any = {}) => {
    const person = buildPerson(personOverrides);
    mockPersonModel.findById.mockReturnValue(buildQueryChain(person));
    return person;
  };

  describe('create', () => {
    it('rejects when the requested order is already taken', async () => {
      mockBoardTermModel.findOne.mockResolvedValue({
        _id: 'existing',
        order: 1,
      });

      await expect(
        service.create(buildCreateTermDto({ order: 1 })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when endsAt is not after startsAt', async () => {
      mockBoardTermModel.findOne.mockResolvedValue(null);
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([]));

      await expect(
        service.create(
          buildCreateTermDto({
            startsAt: new Date('2020-01-01T00:00:00.000Z'),
            endsAt: new Date('2019-01-01T00:00:00.000Z'),
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the candidate dates overlap an existing term', async () => {
      mockBoardTermModel.findOne.mockResolvedValue(null);
      const conflictingExisting = {
        order: 1,
        startsAt: new Date('2018-01-01T00:00:00.000Z'),
        endsAt: new Date('2025-01-01T00:00:00.000Z'),
      };
      mockBoardTermModel.find.mockReturnValue(
        buildQueryChain([conflictingExisting]),
      );

      await expect(
        service.create(
          buildCreateTermDto({
            startsAt: new Date('2020-01-01T00:00:00.000Z'),
            endsAt: new Date('2023-01-01T00:00:00.000Z'),
          }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when chronology contradicts numbering (higher order, earlier start)', async () => {
      mockBoardTermModel.findOne.mockResolvedValue(null);
      // No overlap: existing term runs 2010-2015, candidate runs 2005-2009.
      // Chronology: order 2 must not start before order 1 starts.
      const priorTerm = {
        order: 1,
        startsAt: new Date('2010-01-01T00:00:00.000Z'),
        endsAt: new Date('2015-01-01T00:00:00.000Z'),
      };
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([priorTerm]));

      await expect(
        service.create(
          buildCreateTermDto({
            order: 2,
            startsAt: new Date('2005-01-01T00:00:00.000Z'),
            endsAt: new Date('2009-01-01T00:00:00.000Z'),
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists a new term when all validations pass', async () => {
      mockBoardTermModel.findOne.mockResolvedValue(null);
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([]));
      const created = buildTerm({ members: [] });
      mockBoardTermModel.create.mockResolvedValue(created);

      const result = await service.create(
        buildCreateTermDto({
          name: { en: 'New Term' },
          order: 4,
          startsAt: new Date('2023-06-22T00:00:00.000Z'),
          endsAt: null,
        }),
      );

      // Self-validating: a single boolean check that proves persistence happened.
      expect(mockBoardTermModel.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException for a non-ObjectId input without querying the database', async () => {
      await expect(service.findById('not-a-valid-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      // Speed + Independence: short-circuited, no DB call was queued.
      expect(mockBoardTermModel.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the term does not exist', async () => {
      mockBoardTermModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_TERM_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('rejects a person whose role is not BOARD', async () => {
      stubTermById();
      stubPersonById({ role: PersonRole.PRESIDENT });

      await expect(
        service.addMember(FIXED_TERM_ID, buildAddMemberDto()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a person who is already a member of the term', async () => {
      const personObjectId = new Types.ObjectId(FIXED_PERSON_ID);
      stubTermById({
        members: [
          buildMember({
            person: personObjectId,
            position: BoardPosition.MEMBER,
          }),
        ],
      });
      stubPersonById();

      await expect(
        service.addMember(
          FIXED_TERM_ID,
          buildAddMemberDto({ position: BoardPosition.CHAIRMAN }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects seating a second chairman in the same term (singleton enforcement)', async () => {
      const otherPersonId = new Types.ObjectId(newObjectId());
      stubTermById({
        members: [
          buildMember({
            person: otherPersonId,
            position: BoardPosition.CHAIRMAN,
          }),
        ],
      });
      stubPersonById();

      await expect(
        service.addMember(FIXED_TERM_ID, buildAddMemberDto()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the term id is not a valid ObjectId', async () => {
      await expect(
        service.addMember('not-valid', buildAddMemberDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the person id is not a valid ObjectId', async () => {
      await expect(
        service.addMember(
          FIXED_TERM_ID,
          buildAddMemberDto({ person: 'not-valid' }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the person does not exist', async () => {
      stubTermById();
      mockPersonModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.addMember(FIXED_TERM_ID, buildAddMemberDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the term does not exist', async () => {
      mockBoardTermModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.addMember(FIXED_TERM_ID, buildAddMemberDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('appends a non-singleton member and persists the change', async () => {
      // Independence: build a term whose `members` array is the same reference
      // the service mutates, so we can assert on it directly without coupling
      // the test to the internal `this.findById()` re-read.
      const otherPersonId = new Types.ObjectId(newObjectId());
      const term = buildTerm({
        members: [
          buildMember({
            person: otherPersonId,
            position: BoardPosition.MEMBER,
            order: 0,
          }),
        ],
      });
      mockBoardTermModel.findById.mockReturnValue(buildQueryChain(term));
      stubPersonById();

      await service.addMember(
        FIXED_TERM_ID,
        buildAddMemberDto({ position: BoardPosition.MEMBER }),
      );

      expect(term.members).toHaveLength(2);
      expect(term.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws NotFoundException for a non-ObjectId id', async () => {
      await expect(service.delete('not-valid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes the term and reports success', async () => {
      const term = buildTerm();
      // Two queries: the existence check, then the actual delete.
      // findByIdAndDelete(id).exec() is awaited in the service, so the
      // chain must expose .exec().
      mockBoardTermModel.findById.mockReturnValueOnce(buildQueryChain(term));
      mockBoardTermModel.findByIdAndDelete.mockReturnValue(
        buildQueryChain(term),
      );

      const result = await service.delete(FIXED_TERM_ID);

      expect(result).toEqual({ success: true });
      expect(mockBoardTermModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_TERM_ID,
      );
    });
  });

  describe('getEligiblePeople', () => {
    it('returns BOARD-role people not yet attached to the term', async () => {
      const takenPersonId = new Types.ObjectId(newObjectId());
      stubTermById({
        members: [buildMember({ person: takenPersonId })],
      });
      const eligible = [
        buildPerson({ _id: new Types.ObjectId(newObjectId()).toString() }),
      ];
      mockPersonModel.find.mockReturnValue(buildQueryChain(eligible));

      const result = await service.getEligiblePeople(FIXED_TERM_ID);

      expect(result).toEqual(eligible);
      const filter = (
        mockPersonModel.find.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0];
      expect(filter.role).toBe(PersonRole.BOARD);
      // `getEligiblePeople` builds a $nin of the taken ObjectIds.
      const idClause = filter._id as { $nin: unknown[] };
      expect(Array.isArray(idClause.$nin)).toBe(true);
      expect(idClause.$nin).toHaveLength(1);
    });

    it('throws NotFoundException when the term does not exist', async () => {
      mockBoardTermModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.getEligiblePeople(FIXED_TERM_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

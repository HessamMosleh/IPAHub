import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BoardService } from './board.service';
import { BoardPosition, BoardTerm } from '../board-term.schema';
import { Person, PersonRole } from '../../person/person.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildBoardTermModelMock,
  buildPersonModelMock,
  buildQueryChain,
  buildTerm,
} from './__test-helpers__/board-test-fixtures';

describe('BoardService', () => {
  let service: BoardService;
  let mockBoardTermModel: ReturnType<typeof buildBoardTermModelMock>;
  let mockPersonModel: ReturnType<typeof buildPersonModelMock>;

  // Independence: fresh mocks + cleared call history before every test so
  // no state leaks between cases. The previous version shared a single mock
  // instance across the file, which is what made a late test in the file
  // inherit return values set by an early one.
  beforeEach(async () => {
    mockBoardTermModel = buildBoardTermModelMock();
    mockPersonModel = buildPersonModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
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

    service = module.get<BoardService>(BoardService);
  });

  // Self-validating: a single boolean expectation — passes or fails clearly.
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllTerms', () => {
    it('returns terms sorted newest first with members sorted by position hierarchy', async () => {
      // Repeatability: fixtures are rebuilt per test, so this run is identical
      // to the next one regardless of when it executes.
      const termWithMembers = buildTerm({
        _id: 'term-2',
        order: 2,
        members: [
          {
            _id: 'm1',
            position: BoardPosition.MEMBER,
            order: 1,
            person: { _id: 'p2', order: 2 },
          },
          {
            _id: 'm2',
            position: BoardPosition.CHAIRMAN,
            order: 0,
            person: { _id: 'p1', order: 1 },
          },
        ],
      });
      const emptyTerm = buildTerm({ _id: 'term-1', order: 1, members: [] });
      mockBoardTermModel.find.mockReturnValue(
        buildQueryChain([termWithMembers, emptyTerm]),
      );

      const result = await service.findAllTerms();

      expect(result).toHaveLength(2);
      // sortBoardMembers() places CHAIRMAN before MEMBER within the term.
      expect(result[0].members[0].position).toBe(BoardPosition.CHAIRMAN);
      expect(result[0].members[1].position).toBe(BoardPosition.MEMBER);
    });

    it('escapes user-supplied search input to prevent regex injection', async () => {
      const term = buildTerm();
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([term]));

      await service.findAllTerms({ search: '.*+?' });

      // Independence: only one call to find() per test — no shared state.
      expect(mockBoardTermModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockBoardTermModel.find.mock.calls[0] as unknown as [
          Record<string, any>,
        ]
      )[0];
      // The literal characters that would otherwise form a regex are escaped.
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      const pattern: string = orClause[0]['name.en'].source;
      expect(pattern).toContain('\\.');
      expect(pattern).toContain('\\+');
      expect(pattern).toContain('\\?');
    });
  });

  describe('getBoardView', () => {
    it('falls back to legacy board members when no terms exist', async () => {
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([]));
      mockPersonModel.find.mockReturnValue(
        buildQueryChain([
          {
            _id: 'p1',
            name: { en: 'Legacy Person' },
            role: PersonRole.BOARD,
            order: 1,
            status: ActiveStatus.ACTIVE,
          },
        ]),
      );

      const view = await service.getBoardView();

      expect(view.isLegacy).toBe(true);
      expect(view.terms).toHaveLength(0);
      expect(view.members).toHaveLength(1);
      const firstMember = view.members[0] as unknown as {
        person: { name: { en: string } };
      };
      expect(firstMember.person.name.en).toBe('Legacy Person');
    });

    it('filters inactive members out of the current term but preserves them in historical rosters', async () => {
      const currentTerm = buildTerm({
        _id: 't2',
        order: 2,
        startsAt: new Date('2023-01-01T00:00:00.000Z'),
        endsAt: null,
        members: [
          {
            _id: 'm1',
            position: BoardPosition.CHAIRMAN,
            order: 0,
            person: {
              _id: 'p1',
              status: ActiveStatus.ACTIVE,
              order: 1,
            },
          },
          {
            _id: 'm2',
            position: BoardPosition.MEMBER,
            order: 1,
            person: {
              _id: 'p2',
              status: ActiveStatus.DISABLED,
              order: 2,
            },
          },
        ],
      });
      const pastTerm = buildTerm({
        _id: 't1',
        order: 1,
        startsAt: new Date('2020-01-01T00:00:00.000Z'),
        endsAt: new Date('2023-01-01T00:00:00.000Z'),
        members: [
          {
            _id: 'm3',
            position: BoardPosition.CHAIRMAN,
            order: 0,
            person: {
              _id: 'p2',
              status: ActiveStatus.DISABLED,
              order: 1,
            },
          },
        ],
      });
      mockBoardTermModel.find.mockReturnValue(
        buildQueryChain([currentTerm, pastTerm]),
      );

      const currentView = await service.getBoardView();
      const pastView = await service.getBoardView(1);

      // Current term: disabled p2 is filtered out.
      expect(currentView.isLegacy).toBe(false);
      expect(currentView.selectedTerm?.order).toBe(2);
      expect(currentView.members).toHaveLength(1);
      // Historical term: disabled p2 is preserved for the historical record.
      expect(pastView.selectedTerm?.order).toBe(1);
      expect(pastView.members).toHaveLength(1);
    });
  });

  describe('getBoardServiceForPerson', () => {
    it('returns an empty list for a non-ObjectId input without touching the database', async () => {
      const result = await service.getBoardServiceForPerson('not-a-valid-id');

      expect(result).toEqual([]);
      // Independence / Speed: short-circuits before any DB call.
      expect(mockBoardTermModel.find).not.toHaveBeenCalled();
    });

    it('returns the terms a person served on, newest first', async () => {
      const p1 = new Types.ObjectId('507f1f77bcf86cd7994390aa');
      const termA = buildTerm({
        _id: 't2',
        order: 2,
        members: [{ person: p1, position: BoardPosition.CHAIRMAN }],
      });
      const termB = buildTerm({
        _id: 't1',
        order: 1,
        members: [{ person: p1, position: BoardPosition.MEMBER }],
      });
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([termA, termB]));

      const result = await service.getBoardServiceForPerson(p1.toString());

      expect(result).toHaveLength(2);
      expect(result[0].termOrder).toBe(2);
      expect(result[0].position).toBe(BoardPosition.CHAIRMAN);
      expect(result[1].termOrder).toBe(1);
      expect(result[1].position).toBe(BoardPosition.MEMBER);
    });
  });

  describe('getBoardStanding', () => {
    it('distinguishes current seat holders from former members across all terms', async () => {
      const termA = buildTerm({
        _id: 't2',
        order: 2,
        members: [
          { person: 'p1', position: BoardPosition.CHAIRMAN },
          { person: 'p2', position: BoardPosition.MEMBER },
        ],
      });
      const termB = buildTerm({
        _id: 't1',
        order: 1,
        members: [
          { person: 'p2', position: BoardPosition.CHAIRMAN },
          { person: 'p3', position: BoardPosition.MEMBER },
        ],
      });
      mockBoardTermModel.find.mockReturnValue(buildQueryChain([termA, termB]));

      const standing = await service.getBoardStanding();

      expect(standing.current['p1']).toBe(BoardPosition.CHAIRMAN);
      expect(standing.current['p2']).toBe(BoardPosition.MEMBER);
      // p1 + p2 are in the current term, so only p3 is "former".
      expect(standing.former).toEqual(['p3']);
    });
  });
});

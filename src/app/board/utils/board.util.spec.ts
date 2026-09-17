import { BoardPosition } from '../board-term.schema';
import {
  BOARD_POSITIONS,
  boardPositionOrder,
  defaultTerm,
  findChronologyConflict,
  findOverlappingTerm,
  isSingletonBoardPosition,
  resolveTerm,
  SINGLETON_BOARD_POSITIONS,
  sortBoardMembers,
  termsOverlap,
} from './board.util';

describe('Board Utilities', () => {
  describe('Singleton Positions', () => {
    it('identifies singleton positions correctly', () => {
      expect(isSingletonBoardPosition(BoardPosition.CHAIRMAN)).toBe(true);
      expect(isSingletonBoardPosition(BoardPosition.VICE_CHAIRMAN)).toBe(true);
      expect(isSingletonBoardPosition(BoardPosition.SECRETARY)).toBe(true);
      expect(isSingletonBoardPosition(BoardPosition.TREASURER)).toBe(true);
      expect(isSingletonBoardPosition(BoardPosition.MEMBER)).toBe(false);
      expect(isSingletonBoardPosition(BoardPosition.ALTERNATE)).toBe(false);
      expect(isSingletonBoardPosition('unknown')).toBe(false);
    });

    it('contains exactly 4 singleton positions', () => {
      expect(SINGLETON_BOARD_POSITIONS).toHaveLength(4);
    });
  });

  describe('Board Position Order', () => {
    it('orders known positions correctly', () => {
      expect(boardPositionOrder(BoardPosition.CHAIRMAN)).toBe(0);
      expect(boardPositionOrder(BoardPosition.VICE_CHAIRMAN)).toBe(1);
      expect(boardPositionOrder(BoardPosition.SECRETARY)).toBe(2);
      expect(boardPositionOrder(BoardPosition.TREASURER)).toBe(3);
      expect(boardPositionOrder(BoardPosition.MEMBER)).toBe(4);
      expect(boardPositionOrder(BoardPosition.ALTERNATE)).toBe(5);
    });

    it('puts unknown or empty positions at the end', () => {
      const last = BOARD_POSITIONS.length;
      expect(boardPositionOrder('')).toBe(last);
      expect(boardPositionOrder(null)).toBe(last);
      expect(boardPositionOrder(undefined)).toBe(last);
      expect(boardPositionOrder('unknown-pos')).toBe(last);
    });
  });

  describe('Terms Overlap', () => {
    const span = (s: string, e: string | null) => ({
      startsAt: new Date(s),
      endsAt: e ? new Date(e) : null,
    });

    it('returns false for strictly consecutive non-overlapping terms [startsAt, endsAt)', () => {
      // Half-open ranges: [2017-06-21, 2020-06-21) and [2020-06-21, 2023-06-21)
      expect(
        termsOverlap(
          span('2017-06-21', '2020-06-21'),
          span('2020-06-21', '2023-06-21'),
        ),
      ).toBe(false);
    });

    it('returns true for overlapping date ranges', () => {
      expect(
        termsOverlap(
          span('2020-06-21', '2023-06-21'),
          span('2022-01-01', '2025-01-01'),
        ),
      ).toBe(true);
    });

    it('returns true when one term completely contains another', () => {
      expect(
        termsOverlap(
          span('2014-01-01', '2030-01-01'),
          span('2020-06-21', '2023-06-21'),
        ),
      ).toBe(true);
    });

    it('is symmetric', () => {
      const a = span('2020-06-21', '2023-06-21');
      const b = span('2022-01-01', '2025-01-01');
      expect(termsOverlap(a, b)).toBe(termsOverlap(b, a));
    });

    it('considers open-ended running terms as extending to infinity', () => {
      // An open-ended term starting in 2023 overlaps a 2025-2026 term
      expect(
        termsOverlap(
          span('2023-06-22', null),
          span('2025-01-01', '2026-01-01'),
        ),
      ).toBe(true);

      // But does not overlap a past closed term ending in 2021
      expect(
        termsOverlap(
          span('2023-06-22', null),
          span('2020-01-01', '2021-01-01'),
        ),
      ).toBe(false);

      // Two open-ended terms always overlap
      expect(
        termsOverlap(span('2014-01-01', null), span('2023-06-22', null)),
      ).toBe(true);
    });
  });

  describe('findOverlappingTerm', () => {
    const existing = [
      {
        id: 't1',
        startsAt: new Date('2014-06-21'),
        endsAt: new Date('2017-06-21'),
      },
      {
        id: 't2',
        startsAt: new Date('2017-06-21'),
        endsAt: new Date('2020-06-21'),
      },
      {
        id: 't3',
        startsAt: new Date('2020-06-21'),
        endsAt: new Date('2023-06-21'),
      },
    ];

    it('returns null when candidate does not overlap', () => {
      expect(
        findOverlappingTerm(
          { startsAt: new Date('2023-06-21'), endsAt: null },
          existing,
        ),
      ).toBeNull();
    });

    it('identifies the overlapping term', () => {
      const match = findOverlappingTerm(
        { startsAt: new Date('2019-01-01'), endsAt: new Date('2021-01-01') },
        existing,
      );
      expect(match?.id).toBe('t2');
    });

    it('ignores the term being edited (exceptId)', () => {
      const edited = {
        startsAt: new Date('2017-06-21'),
        endsAt: new Date('2020-06-21'),
      };
      expect(findOverlappingTerm(edited, existing, 't2')).toBeNull();
    });
  });

  describe('findChronologyConflict', () => {
    const existing = [
      {
        id: 't1',
        order: 1,
        startsAt: new Date('2014-06-21'),
        endsAt: new Date('2017-06-21'),
      },
      {
        id: 't2',
        order: 2,
        startsAt: new Date('2017-06-21'),
        endsAt: new Date('2020-06-21'),
      },
      {
        id: 't3',
        order: 3,
        startsAt: new Date('2020-06-21'),
        endsAt: new Date('2023-06-21'),
      },
    ];

    it('returns null when chronology agrees with numbering', () => {
      expect(
        findChronologyConflict(
          { order: 4, startsAt: new Date('2023-06-22'), endsAt: null },
          existing,
        ),
      ).toBeNull();
    });

    it('catches higher order starting earlier than existing terms', () => {
      const conflict = findChronologyConflict(
        { order: 4, startsAt: new Date('2010-01-01'), endsAt: null },
        existing,
      );
      expect(conflict?.id).toBe('t1');
    });

    it('catches lower order starting later than existing terms', () => {
      const conflict = findChronologyConflict(
        { order: 2, startsAt: new Date('2025-01-01'), endsAt: null },
        existing,
        't2',
      );
      expect(conflict?.id).toBe('t3');
    });
  });

  describe('resolveTerm and defaultTerm', () => {
    const terms = [
      { id: 't3', order: 3, memberCount: 5 },
      { id: 't2', order: 2, memberCount: 7 },
      { id: 't1', order: 1, memberCount: 0 },
    ];

    it('resolves explicit term param', () => {
      expect(resolveTerm(terms, '2')?.id).toBe('t2');
      expect(resolveTerm(terms, 1)?.id).toBe('t1');
    });

    it('falls back to default when param is absent or invalid', () => {
      expect(resolveTerm(terms, undefined)?.id).toBe('t3');
      expect(resolveTerm(terms, 'abc')?.id).toBe('t3');
    });

    it('picks newest term with members as default', () => {
      const emptyNewest = [
        { id: 't4', order: 4, memberCount: 0 },
        { id: 't3', order: 3, memberCount: 5 },
      ];
      expect(defaultTerm(emptyNewest)?.id).toBe('t3');
    });
  });

  describe('sortBoardMembers', () => {
    it('sorts members by position hierarchy, then membership order, then person order', () => {
      const members = [
        { position: BoardPosition.MEMBER, order: 2, person: { order: 1 } },
        { position: BoardPosition.CHAIRMAN, order: 0, person: { order: 5 } },
        {
          position: BoardPosition.VICE_CHAIRMAN,
          order: 0,
          person: { order: 0 },
        },
        { position: BoardPosition.MEMBER, order: 1, person: { order: 2 } },
        { position: BoardPosition.ALTERNATE, order: 0, person: { order: 0 } },
      ];

      const sorted = sortBoardMembers(members);
      expect(sorted[0].position).toBe(BoardPosition.CHAIRMAN);
      expect(sorted[1].position).toBe(BoardPosition.VICE_CHAIRMAN);
      expect(sorted[2].position).toBe(BoardPosition.MEMBER);
      expect(sorted[2].order).toBe(1);
      expect(sorted[3].position).toBe(BoardPosition.MEMBER);
      expect(sorted[3].order).toBe(2);
      expect(sorted[4].position).toBe(BoardPosition.ALTERNATE);
    });
  });
});

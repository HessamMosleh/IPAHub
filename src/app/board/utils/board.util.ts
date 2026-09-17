import { Types } from 'mongoose';
import { BoardPosition, SINGLETON_BOARD_POSITIONS } from '../board-term.schema';

export { SINGLETON_BOARD_POSITIONS };

export const BOARD_POSITIONS: readonly BoardPosition[] = [
  BoardPosition.CHAIRMAN,
  BoardPosition.VICE_CHAIRMAN,
  BoardPosition.SECRETARY,
  BoardPosition.TREASURER,
  BoardPosition.MEMBER,
  BoardPosition.ALTERNATE,
];

/**
 * Checks whether a board position is a singleton (i.e. only one person can hold it in a term).
 */
export function isSingletonBoardPosition(
  slug: string | BoardPosition,
): boolean {
  return SINGLETON_BOARD_POSITIONS.includes(slug as BoardPosition);
}

/**
 * Returns the numeric order rank for a board position.
 * Chairman is 0, Alternate is 5, unknown/empty is 6.
 */
export function boardPositionOrder(slug?: string | null): number {
  if (!slug) return BOARD_POSITIONS.length;
  const index = BOARD_POSITIONS.indexOf(
    slug.toLowerCase().trim() as BoardPosition,
  );
  return index === -1 ? BOARD_POSITIONS.length : index;
}

/**
 * Time span of a board term.
 */
export interface TermSpan {
  startsAt: Date | string;
  endsAt?: Date | string | null;
}

/**
 * Checks if two board term spans overlap in time.
 * Ranges are half-open: [startsAt, endsAt).
 * A null/undefined endsAt indicates an ongoing open-ended term (extends to Infinity).
 * Two open-ended terms always overlap.
 */
export function termsOverlap(a: TermSpan, b: TermSpan): boolean {
  const aStart = new Date(a.startsAt).getTime();
  const bStart = new Date(b.startsAt).getTime();
  const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
  const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;

  return aStart < bEnd && bStart < aEnd;
}

/**
 * Finds the first existing term whose date range overlaps with candidate.
 * exceptId skips the term being edited so it cannot clash with itself.
 */
export function findOverlappingTerm<
  T extends TermSpan & { _id?: Types.ObjectId | string; id?: string },
>(candidate: TermSpan, existing: T[], exceptId?: string): T | null {
  const normExceptId = exceptId ? String(exceptId) : undefined;
  return (
    existing.find((t) => {
      const termId = t._id ? String(t._id) : t.id ? String(t.id) : '';
      if (normExceptId && termId === normExceptId) return false;
      return termsOverlap(candidate, t);
    }) ?? null
  );
}

/**
 * Finds the first existing term whose numbering contradicts the calendar chronology.
 * Higher order term must start later than lower order terms.
 */
export function findChronologyConflict<
  T extends TermSpan & {
    _id?: Types.ObjectId | string;
    id?: string;
    order: number;
  },
>(
  candidate: TermSpan & { order: number },
  existing: T[],
  exceptId?: string,
): T | null {
  const normExceptId = exceptId ? String(exceptId) : undefined;
  const candidateStart = new Date(candidate.startsAt).getTime();

  return (
    existing.find((t) => {
      const termId = t._id ? String(t._id) : t.id ? String(t.id) : '';
      if (normExceptId && termId === normExceptId) return false;
      if (t.order === candidate.order) return false; // uniqueness is checked separately

      const candidateIsLater = candidate.order > t.order;
      const candidateStartsLater =
        candidateStart > new Date(t.startsAt).getTime();

      return candidateIsLater !== candidateStartsLater;
    }) ?? null
  );
}

/**
 * Resolves a term from a list based on an optional order parameter.
 * Defaults to the fallback or the first term (highest order when sorted descending).
 */
export function resolveTerm<T extends { order: number }>(
  terms: T[],
  param?: string | number,
  fallback?: T,
): T | undefined {
  if (!terms || terms.length === 0) return undefined;
  if (param === undefined || param === null || param === '') {
    return fallback ?? terms[0];
  }

  const n = typeof param === 'number' ? param : Number(String(param).trim());
  if (!Number.isInteger(n)) {
    return fallback ?? terms[0];
  }

  return terms.find((t) => t.order === n) ?? fallback ?? terms[0];
}

/**
 * Returns the default term to display when no term param is specified:
 * the newest term that has members, or the first term if none have members.
 */
export function defaultTerm<
  T extends { memberCount?: number; members?: any[] },
>(terms: T[]): T | undefined {
  if (!terms || terms.length === 0) return undefined;
  return (
    terms.find((t) => {
      const count =
        typeof t.memberCount === 'number'
          ? t.memberCount
          : Array.isArray(t.members)
            ? t.members.length
            : 0;
      return count > 0;
    }) ?? terms[0]
  );
}

/**
 * Sorts board members by positional hierarchy, then membership order, then person order.
 */
export function sortBoardMembers<
  T extends {
    position: BoardPosition | string;
    order?: number;
    person?: { order?: number } | null;
  },
>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const posDiff =
      boardPositionOrder(a.position) - boardPositionOrder(b.position);
    if (posDiff !== 0) return posDiff;

    const ordDiff = (a.order ?? 0) - (b.order ?? 0);
    if (ordDiff !== 0) return ordDiff;

    const personAOrder = a.person?.order ?? 0;
    const personBOrder = b.person?.order ?? 0;
    return personAOrder - personBOrder;
  });
}

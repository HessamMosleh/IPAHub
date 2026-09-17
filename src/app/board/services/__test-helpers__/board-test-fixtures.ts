import { Types } from 'mongoose';
import { BoardPosition } from '../../board-term.schema';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';
import { PersonRole } from '../../../person/person.schema';

/**
 * Shared test fixtures and builders for board service tests.
 *
 * Centralising this:
 *  - Independence: every test starts from a known, freshly-constructed object
 *    so no state leaks between cases via shared module-level constants.
 *  - Repeatability: ids are generated per-call so tests cannot collide when
 *    the file is run repeatedly or in parallel.
 *  - Speed: builders are plain object literals — no I/O, no real DB.
 */

export const FIXED_TERM_ID = '507f1f77bcf86cd799439011';
export const FIXED_PERSON_ID = '507f1f77bcf86cd799439022';
export const FIXED_OTHER_PERSON_ID = '507f1f77bcf86cd799439033';
export const FIXED_MEMBER_ID = '507f1f77bcf86cd799439044';

/** Mongo ObjectId-shaped hex string unique to this call site. */
export const newObjectId = (): string => new Types.ObjectId().toString();

/**
 * Builder for a `BoardTerm` with sensible defaults so individual tests only
 * override the fields they care about. Returns a plain object (not a class
 * instance) — Mongoose-style chain methods are mocked, not the real model.
 */
export interface BoardTermFixtureOverrides {
  _id?: string;
  order?: number;
  name?: { en: string; fa?: string };
  startsAt?: Date;
  endsAt?: Date | null;
  members?: any[];
  createdAt?: Date;
}

// Plain-object return type (not Partial<BoardTerm>): the strict Mongoose
// document types — ObjectId for _id, Date|undefined (not null) for endsAt —
// fight the way these fixtures are constructed in tests. Mongoose will type
// the runtime model correctly; the fixtures only need to be honest about
// the shape the test is actually relying on.
export type BoardTermLike = {
  _id?: any;
  order: number;
  name: { en: string; fa?: string };
  startsAt: Date;
  endsAt?: Date | null;
  members: any[];
  createdAt?: Date;
  save?: jest.Mock;
};

export const buildTerm = (
  overrides: BoardTermFixtureOverrides = {},
): BoardTermLike => ({
  _id: FIXED_TERM_ID,
  order: 1,
  name: { en: 'Term 1' },
  startsAt: new Date('2020-01-01T00:00:00.000Z'),
  endsAt: new Date('2023-01-01T00:00:00.000Z'),
  members: [],
  createdAt: new Date('2020-01-01T00:00:00.000Z'),
  // Services call `await term.save()` after mutating the embedded members
  // array, so the term itself must expose a save() method. This is what
  // every admin-service mutation test relies on.
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildMember = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_MEMBER_ID,
  person: new Types.ObjectId(FIXED_PERSON_ID),
  position: BoardPosition.MEMBER,
  order: 0,
  ...overrides,
});

export const buildPerson = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_PERSON_ID,
  name: { en: 'Alice Example' },
  role: PersonRole.BOARD,
  order: 1,
  status: ActiveStatus.ACTIVE,
  ...overrides,
});

/**
 * Builds a chainable Mongoose query mock whose terminal `.exec()` resolves
 * to the provided value. Every intermediate method returns `this`, so tests
 * can write `find().select().populate().sort().exec()` and have it just work.
 *
 * Repeatability: each call returns a fresh chain — no leakage between tests.
 */
export type QueryChain = {
  select: jest.Mock;
  populate: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain = {
    select: jest.fn(),
    populate: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.exec.mockResolvedValue(resolvedValue);
  return chain;
};

/**
 * Pre-configured Mongoose model mocks with stub methods.
 * Each call returns a fresh object so tests are independent.
 */
export const buildBoardTermModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
});

export const buildPersonModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
});

/**
 * Reusable DTO factories so test intent is visible at the call site instead
 * of being buried in a wall of `name: { en: '...' }` boilerplate.
 */
export const buildCreateTermDto = (overrides: Record<string, any> = {}) => ({
  name: { en: 'Term 1' },
  order: 1,
  startsAt: new Date('2020-01-01T00:00:00.000Z'),
  endsAt: new Date('2023-01-01T00:00:00.000Z'),
  ...overrides,
});

export const buildAddMemberDto = (overrides: Record<string, any> = {}) => ({
  person: FIXED_PERSON_ID,
  position: BoardPosition.CHAIRMAN,
  ...overrides,
});

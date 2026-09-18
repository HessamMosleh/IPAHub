import { Types } from 'mongoose';
import { NewsCategory, NewsStatus } from '../../news.schema';
import { UserRole } from '../../../user/user.schema';
import { AuthenticatedUser } from '../../../auth/types';

export const FIXED_NEWS_ID = '507f1f77bcf86cd799439011';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439022';
export const OTHER_PROVINCE_ID = '507f1f77bcf86cd799439033';
export const FIXED_USER_ID = '507f1f77bcf86cd799439044';

/**
 * Fixed timestamp for repeatable date-based assertions.
 * Using a hardcoded UTC ISO keeps tests deterministic across runs/timezones
 * (Repeatable) and lets tests compare exact values without `toBeInstanceOf(Date)`.
 */
export const FIXED_PUBLISHED_AT = '2026-09-18T10:00:00.000Z';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface NewsFixtureOverrides {
  _id?: any;
  title?: { en: string; fa?: string };
  subTitle?: { en: string; fa?: string };
  content?: { en: string; fa?: string };
  summery?: { en: string; fa?: string };
  image?: any;
  category?: NewsCategory;
  province?: any;
  status?: NewsStatus;
  author?: any;
  byline?: { en: string; fa?: string };
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Build a fresh, isolated News-like object. Each call returns a new object
 * (Independent) so tests can mutate `existing.title.en` without leaking state
 * into other tests. The `save` jest.fn is also fresh per call.
 */
export const buildNews = (overrides: NewsFixtureOverrides = {}) => ({
  _id: FIXED_NEWS_ID,
  title: { en: 'Annual Conference 2026', fa: 'کنفرانس سالانه ۲۰۲۶' },
  subTitle: {
    en: 'Keynote speakers announced',
    fa: 'سخنرانان کلیدی اعلام شدند',
  },
  content: {
    en: '<p>Welcome to the annual conference.</p>',
    fa: '<p>به کنفرانس سالانه خوش آمدید.</p>',
  },
  summery: {
    en: 'Join us for the national gathering.',
    fa: 'در گردهمایی سراسری شرکت کنید.',
  },
  image: {
    key: 'news/conf-2026.jpg',
    mimeType: 'image/jpeg',
    size: 204800,
    originalName: 'conf.jpg',
  },
  category: NewsCategory.NATIONAL,
  province: undefined,
  status: NewsStatus.ACTIVE,
  author: {
    _id: FIXED_USER_ID,
    fullName: 'Admin User',
    latinFullName: 'Admin User',
  },
  byline: { en: 'Press Office', fa: 'دفتر رسانه' },
  publishedAt: new Date(FIXED_PUBLISHED_AT),
  createdAt: new Date(FIXED_PUBLISHED_AT),
  updatedAt: new Date(FIXED_PUBLISHED_AT),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

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

export const buildNewsModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
});

export const buildProvinceModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
});

export const buildSuperAdminUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '09120000000',
  roles: [UserRole.SUPER_ADMIN],
  province: FIXED_PROVINCE_ID,
  jti: 'super-jti',
  ...overrides,
});

export const buildProvinceAdminUser = (
  managedProvinces: string[] = [FIXED_PROVINCE_ID],
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '09120000001',
  roles: [UserRole.PROVINCE_ADMIN],
  province: managedProvinces[0] ?? FIXED_PROVINCE_ID,
  managedProvinces,
  jti: 'prov-admin-jti',
  ...overrides,
});

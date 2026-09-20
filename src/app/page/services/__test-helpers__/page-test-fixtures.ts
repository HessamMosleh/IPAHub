import { PageKey } from '../../page.schema';

export const FIXED_PAGE_ID = '66fa3b5a9c1e7a001f3e9a11';

export type QueryChain = {
  select: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain: QueryChain = {
    select: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.exec.mockResolvedValue(resolvedValue);
  return chain;
};

export interface MockPageDoc {
  _id: string;
  key: PageKey;
  title: { en: string; fa?: string };
  body: { en: string; fa?: string };
  image?: {
    key: string;
    mimeType?: string;
    size?: number;
    originalName?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  save: jest.Mock;
}

export const buildPageDoc = (
  overrides: Record<string, unknown> = {},
): MockPageDoc => {
  const doc: MockPageDoc = {
    _id: FIXED_PAGE_ID,
    key: PageKey.ABOUT_FORUM,
    title: { en: 'About Us', fa: 'درباره ما' },
    body: {
      en: '<p>About forum content</p>',
      fa: '<p>محتوای درباره انجمن</p>',
    },
    image: undefined,
    createdAt: new Date('2026-09-18T10:00:00.000Z'),
    updatedAt: new Date('2026-09-18T10:00:00.000Z'),
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export const buildPageModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

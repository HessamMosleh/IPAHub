import { ActiveStatus } from '../../../../common/enums/active-status.enum';

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

export interface MockProvinceDoc {
  _id: string;
  slug: string;
  name: { en: string; fa?: string };
  order: number;
  status: ActiveStatus;
  socials?: Record<string, string>;
  contactAddress?: { en: string; fa?: string };
  contactPhone?: string;
  contactEmail?: string;
  save: jest.Mock;
}

export const buildProvinceDoc = (
  overrides: Record<string, unknown> = {},
): MockProvinceDoc => {
  const doc: MockProvinceDoc = {
    _id: '66fa3b5a9c1e7a001f3e9a11',
    slug: 'isfahan',
    name: { en: 'Isfahan', fa: 'اصفهان' },
    order: 14,
    status: ActiveStatus.ACTIVE,
    socials: undefined,
    contactAddress: undefined,
    contactPhone: undefined,
    contactEmail: undefined,
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export const buildProvinceModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

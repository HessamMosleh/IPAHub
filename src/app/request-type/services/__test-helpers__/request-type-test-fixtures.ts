import { ActiveStatus } from '../../../../common/enums/active-status.enum';

export type QueryChain = {
  select: jest.Mock;
  populate: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain: QueryChain = {
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

export interface MockRequestTypeDoc {
  _id: string;
  slug: string;
  name: { en: string; fa?: string };
  description?: { en: string; fa?: string };
  baseFee: number;
  prices: Array<{ province: string | object; fee: number }>;
  producesDocument: boolean;
  order: number;
  status: ActiveStatus;
  createdAt?: Date;
  updatedAt?: Date;
  save: jest.Mock;
  toObject?: jest.Mock;
}

export const FIXED_REQUEST_TYPE_ID = '66fa3b5a9c1e7a001f3e9a11';
export const FIXED_PROVINCE_ID = '66fa3b5a9c1e7a001f3e9a22';

export const buildRequestTypeDoc = (
  overrides: Record<string, unknown> = {},
): MockRequestTypeDoc => {
  const doc: MockRequestTypeDoc = {
    _id: FIXED_REQUEST_TYPE_ID,
    slug: 'membership-certificate',
    name: { en: 'Membership certificate', fa: 'گواهی عضویت' },
    description: { en: 'Official certificate of association membership' },
    baseFee: 300_000,
    prices: [],
    producesDocument: true,
    order: 4,
    status: ActiveStatus.ACTIVE,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    save: jest.fn(),
  };
  doc.save.mockResolvedValue(doc);
  doc.toObject = jest.fn().mockReturnValue({ ...doc });
  Object.assign(doc, overrides);
  return doc;
};

export const buildRequestTypeModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildDocumentRequestModelMock = () => ({
  countDocuments: jest.fn(),
});

export const buildProvinceModelMock = () => ({
  findById: jest.fn(),
});

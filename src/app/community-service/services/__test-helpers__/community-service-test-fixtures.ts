import { Types } from 'mongoose';

export const FIXED_SERVICE_ID = '507f1f77bcf86cd799439011';
export const FIXED_SERVICE_ID_2 = '507f1f77bcf86cd799439022';
export const FIXED_SERVICE_ID_3 = '507f1f77bcf86cd799439033';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface CommunityServiceFixtureOverrides {
  _id?: string;
  title?: { en: string; fa?: string };
  description?: { en: string; fa?: string };
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CommunityServiceLike = {
  _id?: any;
  title: { en: string; fa?: string };
  description: { en: string; fa?: string };
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildCommunityService = (
  overrides: CommunityServiceFixtureOverrides = {},
): CommunityServiceLike => ({
  _id: FIXED_SERVICE_ID,
  title: { en: 'Professional Training', fa: 'آموزش حرفه‌ای' },
  description: {
    en: 'Workshops, webinars and courses.',
    fa: 'کارگاه‌ها، وبینارها و دوره‌ها.',
  },
  order: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export type QueryChain = {
  select: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain = {
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

export const buildCommunityServiceModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildCreateCommunityServiceDto = (
  overrides: Record<string, any> = {},
) => ({
  title: { en: 'New Service', fa: 'خدمت جدید' },
  description: { en: 'New Service Description', fa: 'توضیحات خدمت جدید' },
  ...overrides,
});

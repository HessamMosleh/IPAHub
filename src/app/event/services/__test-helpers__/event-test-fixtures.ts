import { Types } from 'mongoose';
import { EventType } from '../../event.schema';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../../common/enums/payment-status.enum';
import { UserRole, UserStatus } from '../../../user/user.schema';

export const FIXED_EVENT_ID = '507f1f77bcf86cd799439011';
export const FIXED_REGISTRATION_ID = '507f1f77bcf86cd799439022';
export const FIXED_USER_ID = '507f1f77bcf86cd799439033';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439044';
export const OTHER_PROVINCE_ID = '507f1f77bcf86cd799439055';

export const newObjectId = (): string => new Types.ObjectId().toString();

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

export interface MockEventDoc {
  _id: string | Types.ObjectId;
  type: EventType;
  title: { en: string; fa?: string };
  description: { en: string; fa?: string };
  startsAt: Date;
  location?: { en: string; fa?: string };
  capacity?: number;
  fee: number;
  poster?: { key: string };
  province?: any;
  status: ActiveStatus;
  createdAt: Date;
  updatedAt?: Date;
  save: jest.Mock;
}

export const buildEventDoc = (
  overrides: Partial<MockEventDoc> = {},
): MockEventDoc => {
  const doc: MockEventDoc = {
    _id: FIXED_EVENT_ID,
    type: EventType.WORKSHOP,
    title: { en: 'Financial Modeling', fa: 'مدل‌سازی مالی' },
    description: {
      en: 'Workshop on valuation and projections',
      fa: 'کارگاه ارزش‌گذاری و پیش‌بینی‌های مالی',
    },
    // Relative future date keeps upcoming/past filters repeatable over time.
    startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    location: { en: 'Tehran Hall A', fa: 'تهران سالن الف' },
    capacity: 30,
    fee: 500000,
    poster: { key: 'posters/workshop-1.jpg' },
    province: FIXED_PROVINCE_ID,
    status: ActiveStatus.ACTIVE,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export interface MockEventRegistrationDoc {
  _id: string | Types.ObjectId;
  event: any;
  user: any;
  paymentStatus: PaymentStatus;
  attended: boolean;
  certificate?: { key: string };
  createdAt: Date;
  updatedAt?: Date;
  save: jest.Mock;
}

export const buildEventRegistrationDoc = (
  overrides: Partial<MockEventRegistrationDoc> = {},
): MockEventRegistrationDoc => {
  const doc: MockEventRegistrationDoc = {
    _id: FIXED_REGISTRATION_ID,
    event: FIXED_EVENT_ID,
    user: FIXED_USER_ID,
    paymentStatus: PaymentStatus.NONE,
    attended: false,
    certificate: undefined,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export const buildUserFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_USER_ID,
  mobile: '+989121234567',
  nationalCode: '0012345678',
  fullName: 'Ali Rezaei',
  latinFullName: 'Ali Rezaei',
  province: FIXED_PROVINCE_ID,
  roles: [UserRole.USER],
  status: UserStatus.ACTIVE,
  ...overrides,
});

export const buildProvinceFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_PROVINCE_ID,
  slug: 'tehran-city',
  name: { en: 'Tehran City', fa: 'شهر تهران' },
  status: ActiveStatus.ACTIVE,
  ...overrides,
});

export const buildEventModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  aggregate: jest.fn(),
});

export const buildEventRegistrationModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  aggregate: jest.fn(),
});

export const buildUserModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
});

export const buildPaymentModelMock = () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

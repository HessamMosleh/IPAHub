import { Types } from 'mongoose';
import { DocumentRequestStatus } from '../../document-request.schema';
import { MEMBERSHIP_CARD_SLUG } from '../../../request-type/request-type.schema';
import { UserRole, UserStatus } from '../../../user/user.schema';
import { PaymentStatus } from '../../../../common/enums/payment-status.enum';
import { MembershipType } from '../../../../common/enums/membership-type.enum';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';

export const FIXED_REQUEST_ID = '507f1f77bcf86cd799439011';
export const FIXED_USER_ID = '507f1f77bcf86cd799439022';
export const FIXED_REQUEST_TYPE_ID = '507f1f77bcf86cd799439033';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439044';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface DocumentRequestFixtureOverrides {
  _id?: any;
  user?: any;
  requestType?: any;
  status?: DocumentRequestStatus;
  note?: string;
  fee?: number;
  paymentStatus?: PaymentStatus;
  issuedFile?: any;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DocumentRequestLike = {
  _id?: any;
  user?: any;
  requestType?: any;
  status: DocumentRequestStatus;
  note?: string;
  fee: number;
  paymentStatus: PaymentStatus;
  issuedFile?: any;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildDocumentRequest = (
  overrides: DocumentRequestFixtureOverrides = {},
): DocumentRequestLike => ({
  _id: FIXED_REQUEST_ID,
  user: FIXED_USER_ID,
  requestType: FIXED_REQUEST_TYPE_ID,
  status: DocumentRequestStatus.PENDING,
  note: 'Visa embassy requirement letter.',
  fee: 500000,
  paymentStatus: PaymentStatus.NONE,
  createdAt: new Date('2026-09-20T00:00:00.000Z'),
  updatedAt: new Date('2026-09-20T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildUserFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_USER_ID,
  mobile: '+989121234567',
  nationalCode: '0012345678',
  fullName: 'Ali Rezaei',
  latinFullName: 'Ali Rezaei',
  province: FIXED_PROVINCE_ID,
  roles: [UserRole.USER],
  status: UserStatus.ACTIVE,
  membershipType: MembershipType.REGULAR,
  membershipNo: 1001,
  photo: { key: 'portraits/user-123.jpg' },
  ...overrides,
});

export const buildRequestTypeFixture = (
  overrides: Record<string, any> = {},
) => ({
  _id: FIXED_REQUEST_TYPE_ID,
  slug: 'intro-letter',
  name: { en: 'Letter of Introduction', fa: 'معرفی‌نامه' },
  description: {
    en: 'Official letter to organisations',
    fa: 'معرفی‌نامه رسمی',
  },
  baseFee: 500000,
  prices: [{ province: FIXED_PROVINCE_ID, fee: 700000 }],
  producesDocument: true,
  order: 1,
  status: ActiveStatus.ACTIVE,
  ...overrides,
});

export const buildCardRequestTypeFixture = (
  overrides: Record<string, any> = {},
) => ({
  _id: FIXED_REQUEST_TYPE_ID,
  slug: MEMBERSHIP_CARD_SLUG,
  name: { en: 'Membership Card', fa: 'کارت عضویت' },
  description: {
    en: 'Official plastic membership card',
    fa: 'کارت عضویت رسمی',
  },
  baseFee: 300000,
  prices: [],
  producesDocument: true,
  order: 0,
  status: ActiveStatus.ACTIVE,
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

export const buildDocumentRequestModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildRequestTypeModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
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

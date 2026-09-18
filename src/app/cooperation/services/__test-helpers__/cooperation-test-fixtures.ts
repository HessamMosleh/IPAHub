import { Types } from 'mongoose';
import {
  CooperationField,
  CooperationRequestStatus,
} from '../../cooperation-request.schema';
import { UserRole, UserStatus } from '../../../user/user.schema';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';

export const FIXED_COOPERATION_ID = '507f1f77bcf86cd799439011';
export const FIXED_USER_ID = '507f1f77bcf86cd799439022';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439033';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface CooperationFixtureOverrides {
  _id?: any;
  user?: any;
  fields?: CooperationField[];
  description?: string;
  province?: any;
  city?: string;
  postalAddress?: string;
  postalCode?: string;
  telephone?: string;
  status?: CooperationRequestStatus;
  rejectionReason?: string;
  decidedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CooperationRequestLike = {
  _id?: any;
  user?: any;
  fields: CooperationField[];
  description: string;
  province: any;
  city: string;
  postalAddress: string;
  postalCode: string;
  telephone: string;
  status: CooperationRequestStatus;
  rejectionReason?: string;
  decidedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildCooperationRequest = (
  overrides: CooperationFixtureOverrides = {},
): CooperationRequestLike => ({
  _id: FIXED_COOPERATION_ID,
  user: FIXED_USER_ID,
  fields: [CooperationField.EDUCATIONAL, CooperationField.RESEARCH],
  description: 'Proposing educational and research workshop series.',
  province: FIXED_PROVINCE_ID,
  city: 'Tehran',
  postalAddress: 'No. 12, Example St., Area 5',
  postalCode: '1234567890',
  telephone: '02112345678',
  status: CooperationRequestStatus.PENDING,
  createdAt: new Date('2026-09-18T00:00:00.000Z'),
  updatedAt: new Date('2026-09-18T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildUserFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_USER_ID,
  mobile: '+989121234567',
  nationalCode: '0012345678',
  fullName: 'Hessam Mosleh',
  roles: [UserRole.USER],
  status: UserStatus.ACTIVE,
  membershipExpiresAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
  ...overrides,
});

export const buildProvinceFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_PROVINCE_ID,
  slug: 'tehran-city',
  name: { en: 'Tehran (City)', fa: 'تهران (شهر)' },
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

export const buildCooperationRequestModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildUserModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
});

export const buildProvinceModelMock = () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  exists: jest.fn(),
});

export const buildCreateCooperationRequestDto = (
  overrides: Record<string, any> = {},
) => ({
  fields: [CooperationField.EDUCATIONAL, CooperationField.RESEARCH],
  description: 'Proposal text',
  province: FIXED_PROVINCE_ID,
  city: 'Tehran',
  postalAddress: 'No. 12, Example St.',
  postalCode: '1234567890',
  telephone: '02112345678',
  ...overrides,
});

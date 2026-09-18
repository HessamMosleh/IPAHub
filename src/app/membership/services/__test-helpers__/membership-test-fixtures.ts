import { Types } from 'mongoose';
import { MembershipType } from '../../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../../common/enums/payment-status.enum';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';
import {
  MembershipRequestKind,
  MembershipRequestStatus,
} from '../../schemas/membership-request.schema';
import {
  EducationLevel,
  MaritalStatus,
  UserRole,
  UserSex,
  UserStatus,
} from '../../../user/user.schema';
import { MemberDocumentKind } from '../../../user/member-document.schema';

export const FIXED_USER_ID = '507f1f77bcf86cd799439011';
export const FIXED_REQUEST_ID = '507f1f77bcf86cd799439022';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439033';
export const FIXED_OTHER_PROVINCE_ID = '507f1f77bcf86cd799439044';
export const FIXED_ADMIN_ID = '507f1f77bcf86cd799439055';

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

export const buildUserFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_USER_ID,
  mobile: '+989121234567',
  nationalCode: '0012345678',
  fullName: 'Ali Rezaei',
  latinFullName: 'Ali Rezaei',
  sex: UserSex.MAN,
  birthday: new Date('1990-01-01'),
  fatherName: 'Hossein',
  idNumber: '12345',
  idIssuancePlace: 'Tehran',
  maritalStatus: MaritalStatus.SINGLE,
  province: FIXED_PROVINCE_ID,
  educationLevel: EducationLevel.MASTERS,
  fieldOfStudy: 'Psychology',
  university: 'University of Tehran',
  degreeDate: new Date('2015-06-01'),
  roles: [UserRole.USER],
  status: UserStatus.ACTIVE,
  membershipType: MembershipType.AFFILIATE,
  membershipNo: 1001,
  membershipExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
  entranceFeeSettledAt: null,
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildMembershipRequestFixture = (
  overrides: Record<string, any> = {},
) => ({
  _id: FIXED_REQUEST_ID,
  user: FIXED_USER_ID,
  type: MembershipType.REGULAR,
  formData: {
    centerName: 'Example Center',
    licenseAuthority: 'Organization',
    centerFounder: 'Founder Name',
    centerTechnicalManager: 'Manager Name',
    activityLicenseNumber: 'LIC-1234',
    centerStartYear: '1400',
    licenseValidUntil: '2028-01-01',
    provinceId: FIXED_PROVINCE_ID,
    city: 'Tehran',
    postalCode: '1234567890',
    centerPhone: '02112345678',
    centerAddress: 'Example St.',
  },
  kind: MembershipRequestKind.APPLICATION,
  status: MembershipRequestStatus.PENDING,
  rejectionReason: undefined,
  fee: 0,
  creditType: undefined,
  creditApplied: 0,
  entranceFee: 0,
  amountDue: 0,
  paymentStatus: PaymentStatus.NONE,
  paidAt: undefined,
  decidedAt: undefined,
  createdAt: new Date('2026-09-18T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildMembershipFeeFixture = (
  overrides: Record<string, any> = {},
) => ({
  _id: newObjectId(),
  type: MembershipType.REGULAR,
  baseFee: 5000000,
  entranceFee: 2000000,
  prices: [
    {
      province: FIXED_PROVINCE_ID,
      fee: 4000000,
      entranceFee: 1500000,
    },
  ],
  ...overrides,
});

export const buildMembershipTypeInfoFixture = (
  overrides: Record<string, any> = {},
) => ({
  _id: newObjectId(),
  type: MembershipType.REGULAR,
  summary: { en: 'Regular tier summary', fa: 'خلاصه پیوسته' },
  rights: { en: '<p>Voting rights</p>', fa: '<p>حق رای</p>' },
  ...overrides,
});

export const buildProvinceFixture = (overrides: Record<string, any> = {}) => ({
  _id: FIXED_PROVINCE_ID,
  slug: 'tehran-city',
  name: { en: 'Tehran (City)', fa: 'تهران (شهر)' },
  status: ActiveStatus.ACTIVE,
  ...overrides,
});

export const buildMemberDocumentFixture = (
  kind: MemberDocumentKind,
  overrides: Record<string, any> = {},
) => ({
  _id: newObjectId(),
  user: FIXED_USER_ID,
  kind,
  ...overrides,
});

export const buildMembershipRequestModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildMembershipFeeModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
});

export const buildMembershipTypeInfoModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
});

export const buildUserModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
});

export const buildMemberDocumentModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
});

export const buildProvinceModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
});

export const buildPaymentModelMock = () => ({
  create: jest.fn(),
});

export const buildActivationServiceMock = () => ({
  activate: jest.fn(),
});

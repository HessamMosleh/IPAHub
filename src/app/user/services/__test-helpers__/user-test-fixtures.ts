import { Types } from 'mongoose';
import { UserRole, UserStatus } from '../../user.schema';
import { MemberDocumentKind } from '../../member-document.schema';

export const FIXED_USER_ID = '507f1f77bcf86cd799439011';
export const FIXED_ADMIN_ID = '507f1f77bcf86cd799439022';
export const FIXED_PROVINCE_ID = '507f1f77bcf86cd799439033';
export const FIXED_OTHER_PROVINCE_ID = '507f1f77bcf86cd799439044';
export const FIXED_DOCUMENT_ID = '507f1f77bcf86cd799439055';

export const newObjectId = (): string => new Types.ObjectId().toString();

export type QueryChain = {
  select: jest.Mock;
  populate: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain: QueryChain = {
    select: jest.fn(),
    populate: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.lean.mockReturnValue(chain);
  chain.exec.mockResolvedValue(resolvedValue);
  return chain;
};

export interface MockUserDoc {
  _id: string;
  mobile: string;
  email?: string;
  fullName: string;
  latinFullName: string;
  nationalCode: string;
  roles: UserRole[];
  province: string;
  managedProvinces?: string[];
  status: UserStatus;
  active?: boolean;
  membershipType?: string;
  membershipNo?: number | null;
  membershipExpiresAt?: Date | null;
  password?: string;
  rejectionReason?: string;
  save: jest.Mock;
}

/**
 * A member (role `user`). The shape `UserService.toResponse` and the admin
 * services read, so assertions can be made against the same object.
 */
export const buildUserFixture = (
  overrides: Record<string, any> = {},
): MockUserDoc => {
  const doc: MockUserDoc = {
    _id: FIXED_USER_ID,
    mobile: '+989121234567',
    email: 'ali.rezaei@example.com',
    fullName: 'Ali Rezaei',
    latinFullName: 'Ali Rezaei',
    nationalCode: '0012345678',
    roles: [UserRole.USER],
    province: FIXED_PROVINCE_ID,
    status: UserStatus.ACTIVE,
    active: true,
    membershipNo: 1001,
    membershipExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
    rejectionReason: undefined,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return doc;
};

/** A province administrator account (role `province-admin`). */
export const buildProvinceAdminFixture = (
  overrides: Record<string, any> = {},
): MockUserDoc => {
  const doc: MockUserDoc = {
    _id: FIXED_ADMIN_ID,
    mobile: '+989120000001',
    fullName: 'Seyed Karimi',
    latinFullName: 'Seyed Karimi',
    nationalCode: '0011223344',
    roles: [UserRole.PROVINCE_ADMIN],
    province: FIXED_PROVINCE_ID,
    managedProvinces: [FIXED_PROVINCE_ID],
    status: UserStatus.ACTIVE,
    active: true,
    password: 'hashed-password',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return doc;
};

export const buildMemberDocumentFixture = (
  kind: MemberDocumentKind,
  overrides: Record<string, any> = {},
) => ({
  _id: FIXED_DOCUMENT_ID,
  user: FIXED_USER_ID,
  kind,
  file: {
    key: 'documents/license.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    originalName: 'activity-license.pdf',
  },
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const buildUserModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
  updateMany: jest.fn(),
});

export const buildProvinceModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
});

export const buildMemberDocumentModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
});

export const buildMembershipRequestModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
  updateMany: jest.fn(),
});

export const buildUserServiceMock = () => ({
  registerMember: jest.fn(),
  findByMobileOptional: jest.fn(),
  markMobileVerified: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateUser: jest.fn(),
  updateMemberProfile: jest.fn(),
  setPhoto: jest.fn(),
  listDocuments: jest.fn().mockResolvedValue([]),
  getDocument: jest.fn(),
  upsertDocument: jest.fn(),
  deleteDocument: jest.fn(),
  toResponse: jest.fn((user: any) => ({ ...user, _id: String(user._id) })),
});

export const buildSmsSenderMock = () => ({
  send: jest.fn().mockResolvedValue(undefined),
});

export const buildStorageServiceMock = () => ({
  putObject: jest.fn(),
  getObject: jest.fn().mockResolvedValue({
    stream: { pipe: jest.fn() },
    mimeType: 'application/octet-stream',
    size: 0,
  }),
  deleteObject: jest.fn().mockResolvedValue(undefined),
  readPublicFile: jest.fn(),
  readPrivateFile: jest.fn(),
  saveFile: jest.fn(),
  savePrivateFile: jest.fn(),
  deletePrivateFile: jest.fn(),
});

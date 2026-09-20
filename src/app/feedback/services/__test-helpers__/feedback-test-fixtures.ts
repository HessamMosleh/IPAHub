import { Types } from 'mongoose';
import { UserRole, UserStatus } from '../../../user/user.schema';

export const FIXED_FEEDBACK_ID = '507f1f77bcf86cd799439011';
export const FIXED_USER_ID = '507f1f77bcf86cd799439022';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface MockFeedbackDoc {
  _id: string | Types.ObjectId;
  user: any;
  subject?: string;
  body: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  save: jest.Mock;
}

export const buildFeedbackDoc = (
  overrides: Record<string, any> = {},
): MockFeedbackDoc => {
  const doc: MockFeedbackDoc = {
    _id: FIXED_FEEDBACK_ID,
    user: FIXED_USER_ID,
    subject: 'Website improvement idea',
    body: 'Please consider adding a mobile app or PWA.',
    resolved: false,
    createdAt: new Date('2026-09-20T00:00:00.000Z'),
    updatedAt: new Date('2026-09-20T00:00:00.000Z'),
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
  roles: [UserRole.USER],
  status: UserStatus.ACTIVE,
  province: '66fa3b5a9c1e7a001f3e9a11',
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

export const buildFeedbackModelMock = () => {
  const MockModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: FIXED_FEEDBACK_ID,
    resolved: false,
    createdAt: new Date('2026-09-20T00:00:00.000Z'),
    updatedAt: new Date('2026-09-20T00:00:00.000Z'),
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: FIXED_FEEDBACK_ID,
      resolved: false,
      createdAt: new Date('2026-09-20T00:00:00.000Z'),
      updatedAt: new Date('2026-09-20T00:00:00.000Z'),
    }),
  }));

  MockModel.find = jest.fn();
  MockModel.findOne = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.countDocuments = jest.fn();
  MockModel.deleteOne = jest.fn();
  return MockModel;
};

export const buildUserModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
});

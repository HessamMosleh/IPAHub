import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { MembershipActivationService } from './membership-activation.service';
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { User, UserStatus } from '../../user/user.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import {
  buildMembershipRequestFixture,
  buildMembershipRequestModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_REQUEST_ID,
} from './__test-helpers__/membership-test-fixtures';

describe('MembershipActivationService', () => {
  let service: MembershipActivationService;
  let mockRequestModel: ReturnType<typeof buildMembershipRequestModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    mockRequestModel = buildMembershipRequestModelMock();
    mockUserModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipActivationService,
        {
          provide: getModelToken(MembershipRequest.name),
          useValue: mockRequestModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<MembershipActivationService>(
      MembershipActivationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('activate', () => {
    it('returns the request untouched if it is already APPROVED (idempotent)', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.APPROVED,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.activate(FIXED_REQUEST_ID);

      expect(result).toBe(request);
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if the request does not exist', async () => {
      mockRequestModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.activate(FIXED_REQUEST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if the referenced user does not exist', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.activate(FIXED_REQUEST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('assigns base membership number (1000) when no users have a membership number yet', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        membershipNo: null,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockUserModel.findOne.mockReturnValue(buildQueryChain(null)); // No existing highest number

      await service.activate(FIXED_REQUEST_ID);

      expect(user.membershipNo).toBe(1000);
      expect(user.save).toHaveBeenCalled();
    });

    it('increments highest membership number when existing numbers are present', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        membershipNo: null,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockUserModel.findOne.mockReturnValue(
        buildQueryChain({ membershipNo: 1055 }),
      );

      await service.activate(FIXED_REQUEST_ID);

      expect(user.membershipNo).toBe(1056);
      expect(user.save).toHaveBeenCalled();
    });

    it('preserves existing membership number and does not re-query or overwrite', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        membershipNo: 1042,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      expect(user.membershipNo).toBe(1042);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
    });

    it('sets membershipExpiresAt to null for HONORARY membership tier', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.HONORARY,
        status: MembershipRequestStatus.PENDING,
      });
      const user = buildUserFixture({
        membershipExpiresAt: new Date('2026-12-31T00:00:00.000Z'),
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      expect(user.membershipExpiresAt).toBeNull();
      expect(user.membershipType).toBe(MembershipType.HONORARY);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('extends term from existing expiry date if member has future expiry (early renewal)', async () => {
      const futureExpiry = new Date('2027-06-15T00:00:00.000Z');
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        membershipExpiresAt: futureExpiry,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      // Should be 1 year after futureExpiry: 2028-06-15
      expect(user.membershipExpiresAt).toEqual(
        new Date('2028-06-15T00:00:00.000Z'),
      );
    });

    it('extends term from now if existing expiry was in the past (lapsed renewal)', async () => {
      const pastExpiry = new Date('2025-01-01T00:00:00.000Z');
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        membershipExpiresAt: pastExpiry,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const before = Date.now();
      await service.activate(FIXED_REQUEST_ID);
      const after = Date.now();

      expect(user.membershipExpiresAt.getFullYear()).toBe(
        new Date().getFullYear() + 1,
      );
      expect(user.membershipExpiresAt.getTime()).toBeGreaterThan(
        before + 360 * 24 * 60 * 60 * 1000,
      );
      expect(user.membershipExpiresAt.getTime()).toBeLessThan(
        after + 370 * 24 * 60 * 60 * 1000,
      );
    });

    it('stamps entranceFeeSettledAt when request had entranceFee > 0 and user had not settled yet', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        entranceFee: 2000000,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        entranceFeeSettledAt: null,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      expect(user.entranceFeeSettledAt).toBeInstanceOf(Date);
    });

    it('does not overwrite entranceFeeSettledAt if user already had it settled', async () => {
      const alreadySettled = new Date('2024-05-01T00:00:00.000Z');
      const request = buildMembershipRequestFixture({
        type: MembershipType.REGULAR,
        entranceFee: 2000000,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        entranceFeeSettledAt: alreadySettled,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      expect(user.entranceFeeSettledAt).toBe(alreadySettled);
    });

    it('does not stamp entranceFeeSettledAt when request had entranceFee = 0', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.STUDENT,
        entranceFee: 0,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
      });
      const user = buildUserFixture({
        entranceFeeSettledAt: null,
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await service.activate(FIXED_REQUEST_ID);

      expect(user.entranceFeeSettledAt).toBeNull();
    });

    it('flips user to ACTIVE, clears rejectionReason, and stamps request APPROVED with decidedAt', async () => {
      const request = buildMembershipRequestFixture({
        type: MembershipType.AFFILIATE,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
        decidedAt: undefined,
      });
      const user = buildUserFixture({
        status: UserStatus.REGISTERING,
        rejectionReason: 'Previous issue',
      });

      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const result = await service.activate(FIXED_REQUEST_ID);

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.membershipType).toBe(MembershipType.AFFILIATE);
      expect(user.rejectionReason).toBeUndefined();
      expect(user.save).toHaveBeenCalled();

      expect(request.status).toBe(MembershipRequestStatus.APPROVED);
      expect(request.decidedAt).toBeInstanceOf(Date);
      expect(request.save).toHaveBeenCalled();
      expect(result).toBe(request);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipAdminService } from './membership-admin.service';
import { MembershipActivationService } from './membership-activation.service';
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { MembershipFee } from '../schemas/membership-fee.schema';
import { MembershipTypeInfo } from '../schemas/membership-type-info.schema';
import { User, UserRole, UserStatus } from '../../user/user.schema';
import {
  Payment,
  PaymentMethod,
  PaymentSource,
} from '../../payment/payment.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { AuthenticatedUser } from '../../auth/types';
import {
  buildActivationServiceMock,
  buildMembershipFeeFixture,
  buildMembershipFeeModelMock,
  buildMembershipRequestFixture,
  buildMembershipRequestModelMock,
  buildMembershipTypeInfoFixture,
  buildMembershipTypeInfoModelMock,
  buildPaymentModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_ADMIN_ID,
  FIXED_OTHER_PROVINCE_ID,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_ID,
  FIXED_USER_ID,
} from './__test-helpers__/membership-test-fixtures';

describe('MembershipAdminService', () => {
  let service: MembershipAdminService;
  let mockRequestModel: ReturnType<typeof buildMembershipRequestModelMock>;
  let mockFeeModel: ReturnType<typeof buildMembershipFeeModelMock>;
  let mockTypeInfoModel: ReturnType<typeof buildMembershipTypeInfoModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockPaymentModel: ReturnType<typeof buildPaymentModelMock>;
  let mockActivationService: ReturnType<typeof buildActivationServiceMock>;

  const superAdminUser: AuthenticatedUser = {
    id: FIXED_ADMIN_ID,
    mobile: '+989120000001',
    roles: [UserRole.SUPER_ADMIN],
    province: FIXED_PROVINCE_ID,
    jti: 'token-1',
  };

  const provinceAdminUser: AuthenticatedUser = {
    id: FIXED_ADMIN_ID,
    mobile: '+989120000002',
    roles: [UserRole.PROVINCE_ADMIN],
    province: FIXED_PROVINCE_ID,
    managedProvinces: [FIXED_PROVINCE_ID],
    jti: 'token-2',
  };

  beforeEach(async () => {
    mockRequestModel = buildMembershipRequestModelMock();
    mockFeeModel = buildMembershipFeeModelMock();
    mockTypeInfoModel = buildMembershipTypeInfoModelMock();
    mockUserModel = buildUserModelMock();
    mockPaymentModel = buildPaymentModelMock();
    mockActivationService = buildActivationServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipAdminService,
        {
          provide: getModelToken(MembershipRequest.name),
          useValue: mockRequestModel,
        },
        {
          provide: getModelToken(MembershipFee.name),
          useValue: mockFeeModel,
        },
        {
          provide: getModelToken(MembershipTypeInfo.name),
          useValue: mockTypeInfoModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: MembershipActivationService,
          useValue: mockActivationService,
        },
      ],
    }).compile();

    service = module.get<MembershipAdminService>(MembershipAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllRequests', () => {
    it('returns paginated requests with default limit and page', async () => {
      const r1 = buildMembershipRequestFixture();
      mockRequestModel.find.mockReturnValue(buildQueryChain([r1]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(1));

      const result = await service.findAllRequests({}, superAdminUser);

      expect(result.data).toEqual([r1]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('scopes requests to managedProvinces for PROVINCE_ADMIN', async () => {
      mockUserModel.find.mockReturnValue(
        buildQueryChain([{ _id: FIXED_USER_ID }]),
      );
      mockRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllRequests({}, provinceAdminUser);

      expect(mockUserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          province: { $in: [expect.any(Object)] },
        }),
      );
      expect(mockRequestModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { $in: [FIXED_USER_ID] },
        }),
      );
    });

    it('returns empty result when PROVINCE_ADMIN requests province outside their scope', async () => {
      mockRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      const result = await service.findAllRequests(
        { province: FIXED_OTHER_PROVINCE_ID },
        provinceAdminUser,
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('searches by applicant identity fields via regex', async () => {
      mockUserModel.find.mockReturnValue(
        buildQueryChain([{ _id: FIXED_USER_ID }]),
      );
      mockRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllRequests({ search: 'Ali' }, superAdminUser);

      expect(mockUserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { fullName: expect.any(RegExp) as unknown },
            { mobile: expect.any(RegExp) as unknown },
            { nationalCode: expect.any(RegExp) as unknown },
            { email: expect.any(RegExp) as unknown },
          ],
        }),
      );
    });
  });

  describe('findRequestById', () => {
    it('returns a request with populated user details', async () => {
      const applicant = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const request = buildMembershipRequestFixture({ user: applicant });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.findRequestById(
        FIXED_REQUEST_ID,
        superAdminUser,
      );

      expect(result).toBe(request);
    });

    it('throws NotFoundException on invalid ObjectId', async () => {
      await expect(
        service.findRequestById('invalid-id', superAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if PROVINCE_ADMIN accesses request outside their scope', async () => {
      const outsideApplicant = buildUserFixture({
        province: FIXED_OTHER_PROVINCE_ID,
      });
      const request = buildMembershipRequestFixture({
        user: outsideApplicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.findRequestById(FIXED_REQUEST_ID, provinceAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve', () => {
    it('quotes bill and transitions to AWAITING_PAYMENT when amountDue > 0', async () => {
      const applicant = buildUserFixture({
        province: FIXED_PROVINCE_ID,
        membershipType: null,
        entranceFeeSettledAt: null,
      });
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.PENDING,
        type: MembershipType.REGULAR,
        user: applicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      // Fees: base 5M, entrance 2M -> amountDue = 7M
      mockFeeModel.find.mockReturnValue(
        buildQueryChain([
          buildMembershipFeeFixture({
            type: MembershipType.REGULAR,
            baseFee: 5000000,
            entranceFee: 2000000,
            prices: [],
          }),
        ]),
      );

      await service.approve(FIXED_REQUEST_ID, superAdminUser);

      expect(request.fee).toBe(5000000);
      expect(request.entranceFee).toBe(2000000);
      expect(request.amountDue).toBe(7000000);
      expect(request.status).toBe(MembershipRequestStatus.AWAITING_PAYMENT);
      expect(request.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(request.decidedAt).toBeInstanceOf(Date);
      expect(request.save).toHaveBeenCalled();
      expect(mockActivationService.activate).not.toHaveBeenCalled();
    });

    it('activates immediately when amountDue === 0 (free tier or full credit)', async () => {
      const applicant = buildUserFixture({
        province: FIXED_PROVINCE_ID,
        membershipType: MembershipType.REGULAR,
        status: UserStatus.ACTIVE,
        entranceFeeSettledAt: new Date('2024-01-01'),
      });
      // Tier change to AFFILIATE: fee 3M - credit 5M = 0
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.PENDING,
        type: MembershipType.AFFILIATE,
        user: applicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      mockFeeModel.find.mockReturnValue(
        buildQueryChain([
          buildMembershipFeeFixture({
            type: MembershipType.REGULAR,
            baseFee: 5000000,
            entranceFee: 2000000,
            prices: [],
          }),
          buildMembershipFeeFixture({
            type: MembershipType.AFFILIATE,
            baseFee: 3000000,
            entranceFee: 0,
            prices: [],
          }),
        ]),
      );

      mockActivationService.activate.mockResolvedValue(request);

      await service.approve(FIXED_REQUEST_ID, superAdminUser);

      expect(request.amountDue).toBe(0);
      expect(mockActivationService.activate).toHaveBeenCalledWith(
        request._id.toString(),
      );
    });

    it('throws BadRequestException if request is already decided', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.APPROVED,
        user: buildUserFixture(),
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.approve(FIXED_REQUEST_ID, superAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('rejects a pending request and also rejects applicant if not yet active', async () => {
      const applicant = buildUserFixture({
        status: UserStatus.REGISTERING,
      });
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.PENDING,
        user: applicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(applicant));

      await service.reject(
        FIXED_REQUEST_ID,
        { reason: 'Documents unclear' },
        superAdminUser,
      );

      expect(request.status).toBe(MembershipRequestStatus.REJECTED);
      expect(request.rejectionReason).toBe('Documents unclear');
      expect(request.decidedAt).toBeInstanceOf(Date);
      expect(request.save).toHaveBeenCalled();

      expect(applicant.status).toBe(UserStatus.REJECTED);
      expect(applicant.rejectionReason).toBe('Documents unclear');
      expect(applicant.save).toHaveBeenCalled();
    });

    it('does not reject an active member on tier change rejection', async () => {
      const applicant = buildUserFixture({
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.AFFILIATE,
      });
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.PENDING,
        type: MembershipType.REGULAR,
        user: applicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockUserModel.findById.mockReturnValue(buildQueryChain(applicant));

      await service.reject(
        FIXED_REQUEST_ID,
        { reason: 'Activity licence missing' },
        superAdminUser,
      );

      expect(request.status).toBe(MembershipRequestStatus.REJECTED);
      expect(applicant.status).toBe(UserStatus.ACTIVE); // remains active
    });

    it('throws BadRequestException if request is not PENDING', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.AWAITING_PAYMENT,
        user: buildUserFixture(),
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.reject(FIXED_REQUEST_ID, {}, superAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markPaid', () => {
    it('confirms offline payment, records ledger row, and activates membership', async () => {
      const applicant = buildUserFixture({
        _id: FIXED_USER_ID,
        province: FIXED_PROVINCE_ID,
      });
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        amountDue: 5000000,
        type: MembershipType.REGULAR,
        user: applicant,
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      // Atomic conditional updateOne succeeds
      mockRequestModel.updateOne.mockReturnValue(
        buildQueryChain({ modifiedCount: 1 }),
      );
      mockPaymentModel.create.mockResolvedValue({});
      mockActivationService.activate.mockResolvedValue(request);

      await service.markPaid(
        FIXED_REQUEST_ID,
        { reference: 'TRK-9900', note: 'Bank transfer' },
        superAdminUser,
      );

      expect(mockRequestModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MembershipRequestStatus.AWAITING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
          }) as unknown,
        }),
      );

      expect(mockPaymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000000,
          source: PaymentSource.MEMBERSHIP,
          sourceId: request._id,
          method: PaymentMethod.OFFLINE,
          reference: 'TRK-9900',
          note: 'Bank transfer',
          confirmedBy: expect.any(Object) as unknown,
        }),
      );

      expect(mockActivationService.activate).toHaveBeenCalledWith(
        request._id.toString(),
      );
    });

    it('throws BadRequestException if request is not awaiting payment', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.PENDING,
        user: buildUserFixture(),
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.markPaid(FIXED_REQUEST_ID, {}, superAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if concurrent settlement already claimed the request', async () => {
      const request = buildMembershipRequestFixture({
        status: MembershipRequestStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        user: buildUserFixture(),
      });
      mockRequestModel.findById.mockReturnValue(buildQueryChain(request));

      // Atomic claim returns modifiedCount: 0
      mockRequestModel.updateOne.mockReturnValue(
        buildQueryChain({ modifiedCount: 0 }),
      );

      await expect(
        service.markPaid(FIXED_REQUEST_ID, {}, superAdminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('fee management', () => {
    it('findAllFees returns all fee configs', async () => {
      const f1 = buildMembershipFeeFixture();
      mockFeeModel.find.mockReturnValue(buildQueryChain([f1]));

      const result = await service.findAllFees();
      expect(result).toEqual([f1]);
    });

    it('updateFee upserts baseFee and entranceFee', async () => {
      const updated = buildMembershipFeeFixture({
        baseFee: 6000000,
        entranceFee: 2500000,
      });
      mockFeeModel.findOneAndUpdate.mockReturnValue(buildQueryChain(updated));

      const result = await service.updateFee(MembershipType.REGULAR, {
        baseFee: 6000000,
        entranceFee: 2500000,
      });

      expect(mockFeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { type: MembershipType.REGULAR },
        {
          $set: { baseFee: 6000000, entranceFee: 2500000 },
          $setOnInsert: { type: MembershipType.REGULAR },
        },
        { new: true, upsert: true },
      );
      expect(result).toBe(updated);
    });

    it('setProvincePrices filters null fees and keeps entrance override', async () => {
      mockFeeModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      await service.setProvincePrices(MembershipType.REGULAR, {
        prices: [
          {
            province: FIXED_PROVINCE_ID,
            fee: 4000000,
            entranceFee: 1500000,
          },
          {
            province: FIXED_OTHER_PROVINCE_ID,
            fee: null, // should be removed
            entranceFee: null,
          },
        ],
      });

      expect(mockFeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { type: MembershipType.REGULAR },
        {
          $set: {
            prices: [
              {
                province: expect.any(Object) as unknown,
                fee: 4000000,
                entranceFee: 1500000,
              },
            ],
          },
          $setOnInsert: { type: MembershipType.REGULAR },
        },
        { new: true, upsert: true },
      );
    });
  });

  describe('type info management', () => {
    it('findAllTypeInfo returns all copy docs', async () => {
      const info = buildMembershipTypeInfoFixture();
      mockTypeInfoModel.find.mockReturnValue(buildQueryChain([info]));

      const result = await service.findAllTypeInfo();
      expect(result).toEqual([info]);
    });

    it('saveTypeInfo sanitizes rich text and upserts copy', async () => {
      mockTypeInfoModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      await service.saveTypeInfo(MembershipType.REGULAR, {
        summary: { en: 'Valid summary' },
        rights: {
          en: '<p>Allowed</p><script>alert("hack")</script>',
          fa: '<p onclick="hack()">مجاز</p>',
        },
      });

      expect(mockTypeInfoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { type: MembershipType.REGULAR },
        {
          $set: {
            summary: { en: 'Valid summary', fa: undefined },
            rights: {
              en: '<p>Allowed</p>', // script stripped
              fa: '<p>مجاز</p>', // onclick stripped
            },
          },
          $setOnInsert: { type: MembershipType.REGULAR },
        },
        { new: true, upsert: true },
      );
    });

    it('saveTypeInfo throws BadRequestException if English summary is empty', async () => {
      await expect(
        service.saveTypeInfo(MembershipType.REGULAR, {
          summary: { en: '   ' },
          rights: { en: 'Allowed' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('seed', () => {
    it('idempotently seeds fees and typeInfos for each MembershipType', async () => {
      mockFeeModel.updateOne.mockReturnValue(
        buildQueryChain({ upsertedCount: 1 }),
      );
      mockTypeInfoModel.updateOne.mockReturnValue(
        buildQueryChain({ upsertedCount: 1 }),
      );

      const result = await service.seed();

      // 4 membership types: REGULAR, AFFILIATE, STUDENT, HONORARY
      expect(mockFeeModel.updateOne).toHaveBeenCalledTimes(4);
      expect(mockTypeInfoModel.updateOne).toHaveBeenCalledTimes(4);
      expect(result.fees).toBe(4);
      expect(result.typeInfos).toBe(4);
    });
  });
});

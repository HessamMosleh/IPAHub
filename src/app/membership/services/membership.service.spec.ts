import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { MembershipActivationService } from './membership-activation.service';
import {
  MembershipRequest,
  MembershipRequestKind,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { MembershipFee } from '../schemas/membership-fee.schema';
import { MembershipTypeInfo } from '../schemas/membership-type-info.schema';
import { User, UserStatus } from '../../user/user.schema';
import {
  MemberDocument,
  MemberDocumentKind,
} from '../../user/member-document.schema';
import { Province } from '../../../common/schemas/province.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import {
  buildActivationServiceMock,
  buildMemberDocumentFixture,
  buildMemberDocumentModelMock,
  buildMembershipFeeFixture,
  buildMembershipFeeModelMock,
  buildMembershipRequestFixture,
  buildMembershipRequestModelMock,
  buildMembershipTypeInfoFixture,
  buildMembershipTypeInfoModelMock,
  buildProvinceFixture,
  buildProvinceModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_ID,
  FIXED_USER_ID,
  newObjectId,
} from './__test-helpers__/membership-test-fixtures';

describe('MembershipService', () => {
  let service: MembershipService;
  let mockRequestModel: ReturnType<typeof buildMembershipRequestModelMock>;
  let mockFeeModel: ReturnType<typeof buildMembershipFeeModelMock>;
  let mockTypeInfoModel: ReturnType<typeof buildMembershipTypeInfoModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockMemberDocumentModel: ReturnType<typeof buildMemberDocumentModelMock>;
  let mockProvinceModel: ReturnType<typeof buildProvinceModelMock>;
  let mockActivationService: ReturnType<typeof buildActivationServiceMock>;

  beforeEach(async () => {
    mockRequestModel = buildMembershipRequestModelMock();
    mockFeeModel = buildMembershipFeeModelMock();
    mockTypeInfoModel = buildMembershipTypeInfoModelMock();
    mockUserModel = buildUserModelMock();
    mockMemberDocumentModel = buildMemberDocumentModelMock();
    mockProvinceModel = buildProvinceModelMock();
    mockActivationService = buildActivationServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
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
          provide: getModelToken(MemberDocument.name),
          useValue: mockMemberDocumentModel,
        },
        {
          provide: getModelToken(Province.name),
          useValue: mockProvinceModel,
        },
        {
          provide: MembershipActivationService,
          useValue: mockActivationService,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOptions', () => {
    it('returns applicable tiers with live quotes and member standing', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.AFFILIATE,
        status: UserStatus.ACTIVE,
        province: FIXED_PROVINCE_ID,
        entranceFeeSettledAt: null,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      // Fee rows: Regular 5M (prov 4M), Affiliate 3M (prov 2M), Student 1M
      const feeRows = [
        buildMembershipFeeFixture({
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
        }),
        buildMembershipFeeFixture({
          type: MembershipType.AFFILIATE,
          baseFee: 3000000,
          entranceFee: 0,
          prices: [
            {
              province: FIXED_PROVINCE_ID,
              fee: 2500000,
            },
          ],
        }),
        buildMembershipFeeFixture({
          type: MembershipType.STUDENT,
          baseFee: 1000000,
          entranceFee: 0,
          prices: [],
        }),
      ];
      mockFeeModel.find.mockReturnValue(buildQueryChain(feeRows));

      const typeInfos = [
        buildMembershipTypeInfoFixture({ type: MembershipType.REGULAR }),
        buildMembershipTypeInfoFixture({ type: MembershipType.AFFILIATE }),
      ];
      mockTypeInfoModel.find.mockReturnValue(buildQueryChain(typeInfos));

      // No open request
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.getOptions(FIXED_USER_ID);

      expect(result.currentType).toBe(MembershipType.AFFILIATE);
      expect(result.hasOpenRequest).toBe(false);
      expect(result.options).toHaveLength(3);

      // Verify Regular quote:
      // fee = 4,000,000 (prov override)
      // credit = 2,500,000 (AFFILIATE prov override)
      // entrance = 1,500,000 (prov override)
      // amountDue = max(0, 4M - 2.5M) + 1.5M = 1.5M + 1.5M = 3,000,000
      const regularOpt = result.options.find(
        (o) => o.type === MembershipType.REGULAR,
      );
      expect(regularOpt).toBeDefined();
      expect(regularOpt!.isCurrent).toBe(false);
      expect(regularOpt!.quote.fee).toBe(4000000);
      expect(regularOpt!.quote.creditType).toBe(MembershipType.AFFILIATE);
      expect(regularOpt!.quote.creditApplied).toBe(2500000);
      expect(regularOpt!.quote.entranceFee).toBe(1500000);
      expect(regularOpt!.quote.amountDue).toBe(3000000);

      // Verify Affiliate (isCurrent = true):
      const affiliateOpt = result.options.find(
        (o) => o.type === MembershipType.AFFILIATE,
      );
      expect(affiliateOpt!.isCurrent).toBe(true);
    });

    it('sets entranceFee to 0 when entranceFeeSettledAt is already stamped', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.AFFILIATE,
        entranceFeeSettledAt: new Date('2025-01-01'),
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
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
      mockTypeInfoModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.getOptions(FIXED_USER_ID);

      const regOpt = result.options.find(
        (o) => o.type === MembershipType.REGULAR,
      );
      expect(regOpt!.quote.entranceFee).toBe(0);
    });

    it('sets hasOpenRequest to true when an open request exists', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockFeeModel.find.mockReturnValue(buildQueryChain([]));
      mockTypeInfoModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.findOne.mockReturnValue(
        buildQueryChain(
          buildMembershipRequestFixture({
            status: MembershipRequestStatus.PENDING,
          }),
        ),
      );

      const result = await service.getOptions(FIXED_USER_ID);

      expect(result.hasOpenRequest).toBe(true);
    });

    it('throws NotFoundException if user is deleted or does not exist', async () => {
      mockUserModel.findById.mockReturnValue(
        buildQueryChain(buildUserFixture({ status: UserStatus.DELETED })),
      );

      await expect(service.getOptions(FIXED_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('apply', () => {
    const validRegularFormData = {
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
    };

    it('submits a new application successfully with folded digits and PENDING status', async () => {
      const user = buildUserFixture({
        membershipType: undefined,
        status: UserStatus.REGISTERING,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      // Documents: has EDUCATION_CERTIFICATE + ACTIVITY_LICENSE
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );

      // Province exists
      mockProvinceModel.findById.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );

      // No open requests
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      const created = buildMembershipRequestFixture();
      mockRequestModel.create.mockResolvedValue(created);

      const dto = {
        type: MembershipType.REGULAR,
        formData: {
          ...validRegularFormData,
          postalCode: '۱۲۳۴۵۶۷۸۹۰', // Persian digits to fold
          centerStartYear: '۱۴۰۰',
        },
      };

      const result = await service.apply(dto, FIXED_USER_ID);

      expect(mockRequestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MembershipType.REGULAR,
          kind: MembershipRequestKind.APPLICATION,
          status: MembershipRequestStatus.PENDING,
          formData: expect.objectContaining({
            postalCode: '1234567890',
            centerStartYear: '1400',
          }) as unknown,
        }),
      );
      expect(result).toBe(created);
    });

    it('throws BadRequestException if applying for HONORARY tier', async () => {
      await expect(
        service.apply({ type: MembershipType.HONORARY }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if user profile is incomplete (missing required field)', async () => {
      const user = buildUserFixture({
        latinFullName: null, // missing required profile field
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
        ]),
      );

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if EDUCATION_CERTIFICATE is missing from profile', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      // Only has activity license, not education certificate
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if tier-required document is missing (e.g. ACTIVITY_LICENSE for REGULAR)', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      // Missing ACTIVITY_LICENSE
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
        ]),
      );

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if required form fields are missing', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );

      // Missing centerName and postalCode
      const incompleteFormData = {
        licenseAuthority: 'Org',
      };

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: incompleteFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if form field format is invalid (e.g. invalid postal code length)', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );

      const invalidFormData = {
        ...validRegularFormData,
        postalCode: '123', // not 10 digits
      };

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: invalidFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if province specified in formData does not exist', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );
      mockProvinceModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if member already holds the requested tier and is active', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.REGULAR,
        status: UserStatus.ACTIVE,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );
      mockProvinceModel.findById.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if member already has an open PENDING or AWAITING_PAYMENT request', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.AFFILIATE,
        status: UserStatus.ACTIVE,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockMemberDocumentModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberDocumentFixture(MemberDocumentKind.EDUCATION_CERTIFICATE),
          buildMemberDocumentFixture(MemberDocumentKind.ACTIVITY_LICENSE),
        ]),
      );
      mockProvinceModel.findById.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockRequestModel.findOne.mockReturnValue(
        buildQueryChain(
          buildMembershipRequestFixture({
            status: MembershipRequestStatus.AWAITING_PAYMENT,
          }),
        ),
      );

      await expect(
        service.apply(
          { type: MembershipType.REGULAR, formData: validRegularFormData },
          FIXED_USER_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('renew', () => {
    it('creates a renewal request awaiting payment when fee > 0', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.AFFILIATE,
        status: UserStatus.ACTIVE,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      mockFeeModel.find.mockReturnValue(
        buildQueryChain([
          buildMembershipFeeFixture({
            type: MembershipType.AFFILIATE,
            baseFee: 3000000,
            prices: [],
          }),
        ]),
      );

      const renewalReq = buildMembershipRequestFixture({
        kind: MembershipRequestKind.RENEWAL,
        status: MembershipRequestStatus.AWAITING_PAYMENT,
        fee: 3000000,
        amountDue: 3000000,
      });
      mockRequestModel.create.mockResolvedValue(renewalReq);

      const result = await service.renew(FIXED_USER_ID);

      expect(mockRequestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: MembershipRequestKind.RENEWAL,
          status: MembershipRequestStatus.AWAITING_PAYMENT,
          fee: 3000000,
          amountDue: 3000000,
          paymentStatus: PaymentStatus.PENDING,
          creditApplied: 0,
          entranceFee: 0,
        }),
      );
      expect(mockActivationService.activate).not.toHaveBeenCalled();
      expect(result).toBe(renewalReq);
    });

    it('activates immediately when renewal fee is 0', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.STUDENT,
        status: UserStatus.ACTIVE,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));
      mockFeeModel.find.mockReturnValue(
        buildQueryChain([
          buildMembershipFeeFixture({
            type: MembershipType.STUDENT,
            baseFee: 0,
            prices: [],
          }),
        ]),
      );

      const zeroFeeReq = buildMembershipRequestFixture({
        _id: FIXED_REQUEST_ID,
        kind: MembershipRequestKind.RENEWAL,
        fee: 0,
        amountDue: 0,
      });
      mockRequestModel.create.mockResolvedValue(zeroFeeReq);
      mockActivationService.activate.mockResolvedValue(zeroFeeReq);

      await service.renew(FIXED_USER_ID);

      expect(mockActivationService.activate).toHaveBeenCalledWith(
        FIXED_REQUEST_ID,
      );
    });

    it('throws BadRequestException if user has no membershipType or is HONORARY', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.HONORARY,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await expect(service.renew(FIXED_USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if an open request already exists', async () => {
      const user = buildUserFixture({
        membershipType: MembershipType.REGULAR,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockRequestModel.findOne.mockReturnValue(
        buildQueryChain(
          buildMembershipRequestFixture({
            status: MembershipRequestStatus.PENDING,
          }),
        ),
      );

      await expect(service.renew(FIXED_USER_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllByUser', () => {
    it('returns paginated requests for the authenticated user', async () => {
      const r1 = buildMembershipRequestFixture();
      const r2 = buildMembershipRequestFixture({ _id: newObjectId() });

      mockRequestModel.find.mockReturnValue(buildQueryChain([r1, r2]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(2));

      const result = await service.findAllByUser(FIXED_USER_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('filters by status and kind if provided', async () => {
      mockRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllByUser(FIXED_USER_ID, {
        status: MembershipRequestStatus.APPROVED,
        kind: MembershipRequestKind.RENEWAL,
      });

      expect(mockRequestModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MembershipRequestStatus.APPROVED,
          kind: MembershipRequestKind.RENEWAL,
        }),
      );
    });

    it('throws NotFoundException on invalid user id', async () => {
      await expect(service.findAllByUser('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdAndUser', () => {
    it('returns the request if owned by the user', async () => {
      const request = buildMembershipRequestFixture();
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(request));

      const result = await service.findByIdAndUser(
        FIXED_REQUEST_ID,
        FIXED_USER_ID,
      );

      expect(result).toBe(request);
    });

    it('throws NotFoundException if not found or belongs to another user', async () => {
      mockRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findByIdAndUser(FIXED_REQUEST_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException on invalid id format', async () => {
      await expect(
        service.findByIdAndUser('invalid-id', FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

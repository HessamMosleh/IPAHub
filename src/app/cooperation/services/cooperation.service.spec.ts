import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CooperationService } from './cooperation.service';
import {
  CooperationField,
  CooperationRequest,
  CooperationRequestStatus,
} from '../cooperation-request.schema';
import { User, UserStatus } from '../../user/user.schema';
import { Province } from '../../../common/schemas/province.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildCooperationRequest,
  buildCooperationRequestModelMock,
  buildCreateCooperationRequestDto,
  buildProvinceFixture,
  buildProvinceModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_COOPERATION_ID,
  FIXED_PROVINCE_ID,
  FIXED_USER_ID,
} from './__test-helpers__/cooperation-test-fixtures';

describe('CooperationService', () => {
  let service: CooperationService;
  let mockCooperationModel: ReturnType<typeof buildCooperationRequestModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockProvinceModel: ReturnType<typeof buildProvinceModelMock>;

  beforeEach(async () => {
    mockCooperationModel = buildCooperationRequestModelMock();
    mockUserModel = buildUserModelMock();
    mockProvinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CooperationService,
        {
          provide: getModelToken(CooperationRequest.name),
          useValue: mockCooperationModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Province.name),
          useValue: mockProvinceModel,
        },
      ],
    }).compile();

    service = module.get<CooperationService>(CooperationService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a PENDING cooperation request for an active approved member', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const province = buildProvinceFixture();
      mockProvinceModel.findOne.mockReturnValue(buildQueryChain(province));

      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));

      const created = buildCooperationRequest();
      mockCooperationModel.create.mockResolvedValue(created);

      const dto = buildCreateCooperationRequestDto();
      const result = await service.create(dto, FIXED_USER_ID);

      expect(mockUserModel.findById).toHaveBeenCalledWith(FIXED_USER_ID);
      expect(mockProvinceModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_PROVINCE_ID,
        status: ActiveStatus.ACTIVE,
      });
      expect(mockCooperationModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CooperationRequestStatus.PENDING,
        }),
      );
      expect(mockCooperationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CooperationRequestStatus.PENDING,
          fields: [CooperationField.EDUCATIONAL, CooperationField.RESEARCH],
          city: 'Tehran',
          postalCode: '1234567890',
        }),
      );
      expect(result).toEqual(created);
    });

    it('normalises Persian/Arabic digits in postalCode and telephone', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      const dto = buildCreateCooperationRequestDto({
        postalCode: '۱۲۳۴۵۶۷۸۹۰',
        telephone: '۰۲۱۱۲۳۴۵۶۷۸',
      });

      await service.create(dto, FIXED_USER_ID);

      expect(mockCooperationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          postalCode: '1234567890',
          telephone: '02112345678',
        }),
      );
    });

    it('deduplicates areas of cooperation in fields', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      const dto = buildCreateCooperationRequestDto({
        fields: [
          CooperationField.LEGAL,
          CooperationField.LEGAL,
          CooperationField.RESEARCH,
        ],
      });

      await service.create(dto, FIXED_USER_ID);

      expect(mockCooperationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [CooperationField.LEGAL, CooperationField.RESEARCH],
        }),
      );
    });

    it('throws NotFoundException if user is not found', async () => {
      mockUserModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if member status is not ACTIVE', async () => {
      const user = buildUserFixture({ status: UserStatus.REGISTERING });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if member membership has lapsed past grace period', async () => {
      const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const user = buildUserFixture({
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.REGULAR,
        membershipExpiresAt: pastDate,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows submission if member is HONORARY even with past expiry date', async () => {
      const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const user = buildUserFixture({
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.HONORARY,
        membershipExpiresAt: pastDate,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException if province is not active or not found', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if fields array is empty', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );

      const dto = buildCreateCooperationRequestDto({ fields: [] });

      await expect(service.create(dto, FIXED_USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException if member already has a PENDING request', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );

      const existingPending = buildCooperationRequest({
        status: CooperationRequestStatus.PENDING,
      });
      mockCooperationModel.findOne.mockReturnValue(
        buildQueryChain(existingPending),
      );

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('accepts a submission with an empty description (optional field)', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      const dto = buildCreateCooperationRequestDto({ description: '' });
      await service.create(dto, FIXED_USER_ID);

      expect(mockCooperationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '',
        }),
      );
    });

    it('allows submission when membership is within the 30-day grace period', async () => {
      const recentPast = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const user = buildUserFixture({
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.REGULAR,
        membershipExpiresAt: recentPast,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).resolves.toBeDefined();
    });

    it('allows submission when membershipExpiresAt is null (fail-open)', async () => {
      const user = buildUserFixture({
        status: UserStatus.ACTIVE,
        membershipType: MembershipType.REGULAR,
        membershipExpiresAt: undefined,
      });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).resolves.toBeDefined();
    });

    it('allows a new request after previous one was ACCEPTED', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockProvinceModel.findOne.mockReturnValue(
        buildQueryChain(buildProvinceFixture()),
      );
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));
      mockCooperationModel.create.mockResolvedValue(buildCooperationRequest());

      await expect(
        service.create(buildCreateCooperationRequestDto(), FIXED_USER_ID),
      ).resolves.toBeDefined();

      expect(mockCooperationModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllByUser', () => {
    it('returns paginated cooperation requests for the given user', async () => {
      const r1 = buildCooperationRequest();
      const r2 = buildCooperationRequest({
        _id: '507f1f77bcf86cd799439099',
        status: CooperationRequestStatus.ACCEPTED,
      });

      mockCooperationModel.find.mockReturnValue(buildQueryChain([r1, r2]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(2));

      const result = await service.findAllByUser(FIXED_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([r1, r2]);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('applies status filter if provided', async () => {
      mockCooperationModel.find.mockReturnValue(buildQueryChain([]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllByUser(FIXED_USER_ID, {
        status: CooperationRequestStatus.ACCEPTED,
      });

      expect(mockCooperationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CooperationRequestStatus.ACCEPTED,
        }),
      );
    });
  });

  describe('findByIdAndUser', () => {
    it('returns the cooperation request if owned by the user', async () => {
      const request = buildCooperationRequest();
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(request));

      const result = await service.findByIdAndUser(
        FIXED_COOPERATION_ID,
        FIXED_USER_ID,
      );

      expect(result).toEqual(request);
    });

    it('throws NotFoundException if not found or owned by another user', async () => {
      mockCooperationModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findByIdAndUser(FIXED_COOPERATION_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

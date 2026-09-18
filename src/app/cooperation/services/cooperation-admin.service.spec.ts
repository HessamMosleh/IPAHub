import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CooperationAdminService } from './cooperation-admin.service';
import {
  CooperationRequest,
  CooperationRequestStatus,
} from '../cooperation-request.schema';
import { User } from '../../user/user.schema';
import {
  buildCooperationRequest,
  buildCooperationRequestModelMock,
  buildQueryChain,
  buildUserModelMock,
  FIXED_COOPERATION_ID,
  FIXED_PROVINCE_ID,
} from './__test-helpers__/cooperation-test-fixtures';

describe('CooperationAdminService', () => {
  let service: CooperationAdminService;
  let mockCooperationModel: ReturnType<typeof buildCooperationRequestModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    mockCooperationModel = buildCooperationRequestModelMock();
    mockUserModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CooperationAdminService,
        {
          provide: getModelToken(CooperationRequest.name),
          useValue: mockCooperationModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<CooperationAdminService>(CooperationAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated cooperation requests', async () => {
      const r1 = buildCooperationRequest();
      const r2 = buildCooperationRequest({
        _id: '507f1f77bcf86cd799439099',
        status: CooperationRequestStatus.ACCEPTED,
      });

      mockCooperationModel.find.mockReturnValue(buildQueryChain([r1, r2]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(2));

      const result = await service.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual([r1, r2]);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('filters by status', async () => {
      mockCooperationModel.find.mockReturnValue(buildQueryChain([]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAll({ status: CooperationRequestStatus.PENDING });

      expect(mockCooperationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CooperationRequestStatus.PENDING,
        }),
      );
    });

    it('filters by province', async () => {
      mockCooperationModel.find.mockReturnValue(buildQueryChain([]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAll({ province: FIXED_PROVINCE_ID });

      expect(mockCooperationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          province: expect.any(Object) as unknown,
        }),
      );
    });

    it('filters by search term finding users and fields', async () => {
      mockUserModel.find.mockReturnValue(
        buildQueryChain([{ _id: '507f1f77bcf86cd799439088' }]),
      );
      mockCooperationModel.find.mockReturnValue(buildQueryChain([]));
      mockCooperationModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAll({ search: 'Tehran' });

      expect(mockUserModel.find).toHaveBeenCalled();
      expect(mockCooperationModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockCooperationModel.find.mock.calls[0] as unknown as [
          Record<string, unknown>,
        ]
      )[0];
      expect(filter.$or).toBeDefined();
      expect(Array.isArray(filter.$or)).toBe(true);
    });
  });

  describe('findById', () => {
    it('returns a cooperation request by id', async () => {
      const request = buildCooperationRequest();
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.findById(FIXED_COOPERATION_ID);

      expect(mockCooperationModel.findById).toHaveBeenCalledWith(
        FIXED_COOPERATION_ID,
      );
      expect(result).toEqual(request);
    });

    it('throws NotFoundException for invalid id', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when request does not exist', async () => {
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_COOPERATION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('accept', () => {
    it('accepts a PENDING cooperation request and stamps decidedAt', async () => {
      const request = buildCooperationRequest({
        status: CooperationRequestStatus.PENDING,
      });
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.accept(FIXED_COOPERATION_ID);

      expect(mockCooperationModel.findById).toHaveBeenCalledWith(
        FIXED_COOPERATION_ID,
      );
      expect(request.save).toHaveBeenCalled();
      expect(request.status).toBe(CooperationRequestStatus.ACCEPTED);
      expect(request.decidedAt).toBeDefined();
      expect(request.rejectionReason).toBeUndefined();
      expect(result.status).toBe(CooperationRequestStatus.ACCEPTED);
    });

    it('refuses to re-decide a request that was already ACCEPTED', async () => {
      const request = buildCooperationRequest({
        status: CooperationRequestStatus.ACCEPTED,
        decidedAt: new Date(),
      });
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(service.accept(FIXED_COOPERATION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses to re-decide a request that was already REJECTED', async () => {
      const request = buildCooperationRequest({
        status: CooperationRequestStatus.REJECTED,
        decidedAt: new Date(),
        rejectionReason: 'Not eligible',
      });
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(service.accept(FIXED_COOPERATION_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('decline', () => {
    it('declines a PENDING request with reason and stamps decidedAt', async () => {
      const request = buildCooperationRequest({
        status: CooperationRequestStatus.PENDING,
      });
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.decline(FIXED_COOPERATION_ID, {
        reason: 'Proposal is incomplete.',
      });

      expect(mockCooperationModel.findById).toHaveBeenCalledWith(
        FIXED_COOPERATION_ID,
      );
      expect(request.save).toHaveBeenCalled();
      expect(request.status).toBe(CooperationRequestStatus.REJECTED);
      expect(request.rejectionReason).toBe('Proposal is incomplete.');
      expect(request.decidedAt).toBeDefined();
      expect(result.status).toBe(CooperationRequestStatus.REJECTED);
    });

    it('refuses to decline with an empty reason', async () => {
      await expect(
        service.decline(FIXED_COOPERATION_ID, { reason: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to decline with a whitespace-only reason', async () => {
      await expect(
        service.decline(FIXED_COOPERATION_ID, { reason: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to decline a request that is not PENDING', async () => {
      const request = buildCooperationRequest({
        status: CooperationRequestStatus.ACCEPTED,
        decidedAt: new Date(),
      });
      mockCooperationModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.decline(FIXED_COOPERATION_ID, {
          reason: 'Changed our minds',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('deletes a cooperation request by id', async () => {
      mockCooperationModel.findByIdAndDelete.mockReturnValue(
        buildQueryChain(buildCooperationRequest()),
      );

      const result = await service.delete(FIXED_COOPERATION_ID);

      expect(mockCooperationModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_COOPERATION_ID,
      );
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException if request not found', async () => {
      mockCooperationModel.findByIdAndDelete.mockReturnValue(
        buildQueryChain(null),
      );

      await expect(service.delete(FIXED_COOPERATION_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

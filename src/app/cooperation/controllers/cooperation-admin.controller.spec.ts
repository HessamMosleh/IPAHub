import { Test, TestingModule } from '@nestjs/testing';
import { CooperationAdminController } from './cooperation-admin.controller';
import { CooperationAdminService } from '../services/cooperation-admin.service';
import {
  buildCooperationRequest,
  FIXED_COOPERATION_ID,
} from '../services/__test-helpers__/cooperation-test-fixtures';
import { CooperationRequestStatus } from '../cooperation-request.schema';

describe('CooperationAdminController', () => {
  let controller: CooperationAdminController;
  let mockAdminService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    accept: jest.Mock;
    decline: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockAdminService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      accept: jest.fn(),
      decline: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CooperationAdminController],
      providers: [
        {
          provide: CooperationAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<CooperationAdminController>(
      CooperationAdminController,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists cooperation requests delegating to service.findAll', async () => {
    const expected = {
      data: [buildCooperationRequest()],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    mockAdminService.findAll.mockResolvedValue(expected);

    const query = { page: 1, limit: 50 };
    const result = await controller.findAll(query);

    expect(mockAdminService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(expected);
  });

  it('gets request by id delegating to service.findById', async () => {
    const expected = buildCooperationRequest();
    mockAdminService.findById.mockResolvedValue(expected);

    const result = await controller.findById(FIXED_COOPERATION_ID);

    expect(mockAdminService.findById).toHaveBeenCalledWith(
      FIXED_COOPERATION_ID,
    );
    expect(result).toEqual(expected);
  });

  it('accepts proposal delegating to service.accept', async () => {
    const expected = buildCooperationRequest({
      status: CooperationRequestStatus.ACCEPTED,
    });
    mockAdminService.accept.mockResolvedValue(expected);

    const result = await controller.accept(FIXED_COOPERATION_ID);

    expect(mockAdminService.accept).toHaveBeenCalledWith(FIXED_COOPERATION_ID);
    expect(result).toEqual(expected);
  });

  it('declines proposal delegating to service.decline', async () => {
    const expected = buildCooperationRequest({
      status: CooperationRequestStatus.REJECTED,
      rejectionReason: 'Not suitable at this time',
    });
    mockAdminService.decline.mockResolvedValue(expected);

    const dto = { reason: 'Not suitable at this time' };
    const result = await controller.decline(FIXED_COOPERATION_ID, dto);

    expect(mockAdminService.decline).toHaveBeenCalledWith(
      FIXED_COOPERATION_ID,
      dto,
    );
    expect(result).toEqual(expected);
  });

  it('deletes proposal delegating to service.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_COOPERATION_ID);

    expect(mockAdminService.delete).toHaveBeenCalledWith(FIXED_COOPERATION_ID);
    expect(result).toEqual({ success: true });
  });
});

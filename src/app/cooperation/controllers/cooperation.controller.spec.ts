import { Test, TestingModule } from '@nestjs/testing';
import { CooperationController } from './cooperation.controller';
import { CooperationService } from '../services/cooperation.service';
import {
  buildCooperationRequest,
  buildCreateCooperationRequestDto,
  FIXED_COOPERATION_ID,
  FIXED_USER_ID,
} from '../services/__test-helpers__/cooperation-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';

const buildMockUser = (): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '+989121234567',
  roles: [UserRole.USER],
  province: '66fa3b5a9c1e7a001f3e9a11',
  jti: 'session-jti',
});

describe('CooperationController', () => {
  let controller: CooperationController;
  let mockService: {
    create: jest.Mock;
    findAllByUser: jest.Mock;
    findByIdAndUser: jest.Mock;
  };
  let mockUser: AuthenticatedUser;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
    };
    mockUser = buildMockUser();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CooperationController],
      providers: [
        {
          provide: CooperationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CooperationController>(CooperationController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('submits a cooperation request delegating to service.create', async () => {
    const dto = buildCreateCooperationRequestDto();
    const expected = buildCooperationRequest();
    mockService.create.mockResolvedValue(expected);

    const result = await controller.create(dto, mockUser);

    expect(mockService.create).toHaveBeenCalledWith(dto, FIXED_USER_ID);
    expect(result).toEqual(expected);
  });

  it('lists current member requests delegating to service.findAllByUser', async () => {
    const expected = {
      data: [buildCooperationRequest()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockService.findAllByUser.mockResolvedValue(expected);

    const result = await controller.findAll({ page: 1, limit: 20 }, mockUser);

    expect(mockService.findAllByUser).toHaveBeenCalledWith(FIXED_USER_ID, {
      page: 1,
      limit: 20,
    });
    expect(result).toEqual(expected);
  });

  it('gets request by id delegating to service.findByIdAndUser', async () => {
    const expected = buildCooperationRequest();
    mockService.findByIdAndUser.mockResolvedValue(expected);

    const result = await controller.findById(FIXED_COOPERATION_ID, mockUser);

    expect(mockService.findByIdAndUser).toHaveBeenCalledWith(
      FIXED_COOPERATION_ID,
      FIXED_USER_ID,
    );
    expect(result).toEqual(expected);
  });
});

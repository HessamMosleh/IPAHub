import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from '../services/event.service';
import {
  buildEventDoc,
  buildEventRegistrationDoc,
  FIXED_EVENT_ID,
  FIXED_REGISTRATION_ID,
  FIXED_USER_ID,
} from '../services/__test-helpers__/event-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';

const buildMockUser = (): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '+989121234567',
  roles: [UserRole.USER],
  province: '66fa3b5a9c1e7a001f3e9a11',
  jti: 'session-jti',
});

describe('EventController', () => {
  let controller: EventController;
  let mockService: {
    findAllActive: jest.Mock;
    findById: jest.Mock;
    register: jest.Mock;
    findUserRegistrations: jest.Mock;
    findUserRegistrationById: jest.Mock;
  };
  let mockUser: AuthenticatedUser;

  beforeEach(async () => {
    mockService = {
      findAllActive: jest.fn(),
      findById: jest.fn(),
      register: jest.fn(),
      findUserRegistrations: jest.fn(),
      findUserRegistrationById: jest.fn(),
    };
    mockUser = buildMockUser();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists active events delegating to service.findAllActive', async () => {
    const eventDoc = buildEventDoc();
    mockService.findAllActive.mockResolvedValue({
      data: [
        {
          event: eventDoc,
          taken: 10,
          isFull: false,
          isRegistered: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await controller.findAll({ page: 1, limit: 20 }, mockUser);

    expect(mockService.findAllActive).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      FIXED_USER_ID,
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].taken).toBe(10);
  });

  it('gets member registrations delegating to service.findUserRegistrations', async () => {
    const regDoc = buildEventRegistrationDoc();
    mockService.findUserRegistrations.mockResolvedValue({
      data: [regDoc],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await controller.findUserRegistrations(
      { page: 1, limit: 20 },
      mockUser,
    );

    expect(mockService.findUserRegistrations).toHaveBeenCalledWith(
      FIXED_USER_ID,
      { page: 1, limit: 20 },
    );
    expect(result.data).toHaveLength(1);
  });

  it('gets member registration by id delegating to service.findUserRegistrationById', async () => {
    const regDoc = buildEventRegistrationDoc();
    mockService.findUserRegistrationById.mockResolvedValue(regDoc);

    const result = await controller.findUserRegistrationById(
      FIXED_REGISTRATION_ID,
      mockUser,
    );

    expect(mockService.findUserRegistrationById).toHaveBeenCalledWith(
      FIXED_REGISTRATION_ID,
      FIXED_USER_ID,
    );
    expect(result).toEqual(regDoc);
  });

  it('gets event details by id delegating to service.findById', async () => {
    const eventDoc = buildEventDoc();
    mockService.findById.mockResolvedValue({
      event: eventDoc,
      taken: 5,
      isFull: false,
      isRegistered: false,
    });

    const result = await controller.findById(FIXED_EVENT_ID, mockUser);

    expect(mockService.findById).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      FIXED_USER_ID,
    );
    expect(result.taken).toBe(5);
  });

  it('registers by path id delegating to service.register', async () => {
    const regDoc = buildEventRegistrationDoc();
    mockService.register.mockResolvedValue(regDoc);

    const result = await controller.registerById(FIXED_EVENT_ID, mockUser);

    expect(mockService.register).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      FIXED_USER_ID,
    );
    expect(result).toEqual(regDoc);
  });

  it('registers by JSON body delegating to service.register', async () => {
    const regDoc = buildEventRegistrationDoc();
    mockService.register.mockResolvedValue(regDoc);

    const result = await controller.registerByBody(
      { eventId: FIXED_EVENT_ID },
      mockUser,
    );

    expect(mockService.register).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      FIXED_USER_ID,
    );
    expect(result).toEqual(regDoc);
  });

  it('throws BadRequestException if body register has no eventId', async () => {
    await expect(
      controller.registerByBody({}, mockUser),
    ).rejects.toThrow(BadRequestException);
  });
});

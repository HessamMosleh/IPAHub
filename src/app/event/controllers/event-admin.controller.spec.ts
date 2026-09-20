import { Test, TestingModule } from '@nestjs/testing';
import { EventAdminController } from './event-admin.controller';
import { EventAdminService } from '../services/event-admin.service';
import {
  buildEventDoc,
  buildEventRegistrationDoc,
  FIXED_EVENT_ID,
  FIXED_PROVINCE_ID,
  FIXED_REGISTRATION_ID,
} from '../services/__test-helpers__/event-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';
import { EventType } from '../event.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

const buildMockAdmin = (): AuthenticatedUser => ({
  id: 'admin-1',
  mobile: '+989120000001',
  roles: [UserRole.SUPER_ADMIN],
  province: FIXED_PROVINCE_ID,
  jti: 'admin-jti',
});

describe('EventAdminController', () => {
  let controller: EventAdminController;
  let mockService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    setStatus: jest.Mock;
    delete: jest.Mock;
    listRegistrations: jest.Mock;
    markAttended: jest.Mock;
    markPaid: jest.Mock;
    deleteRegistration: jest.Mock;
  };
  let mockAdmin: AuthenticatedUser;

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setStatus: jest.fn(),
      delete: jest.fn(),
      listRegistrations: jest.fn(),
      markAttended: jest.fn(),
      markPaid: jest.fn(),
      deleteRegistration: jest.fn(),
    };
    mockAdmin = buildMockAdmin();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventAdminController],
      providers: [
        {
          provide: EventAdminService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EventAdminController>(EventAdminController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists events delegating to service.findAll', async () => {
    const eventDoc = buildEventDoc();
    mockService.findAll.mockResolvedValue({
      data: [{ event: eventDoc, registrationCount: 5 }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await controller.findAll({ page: 1, limit: 20 }, mockAdmin);

    expect(mockService.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 20 },
      mockAdmin,
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].registrationCount).toBe(5);
  });

  it('gets event by id delegating to service.findById', async () => {
    const eventDoc = buildEventDoc();
    mockService.findById.mockResolvedValue({
      event: eventDoc,
      registrationCount: 10,
    });

    const result = await controller.findById(FIXED_EVENT_ID, mockAdmin);

    expect(mockService.findById).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      mockAdmin,
    );
    expect(result.registrationCount).toBe(10);
  });

  it('creates event delegating to service.create', async () => {
    const eventDoc = buildEventDoc();
    const dto = {
      type: EventType.WORKSHOP,
      title: { en: 'Title' },
      description: { en: 'Desc' },
      startsAt: new Date('2026-11-20T09:00:00Z'),
    };
    mockService.create.mockResolvedValue(eventDoc);

    const result = await controller.create(dto, mockAdmin);

    expect(mockService.create).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result).toEqual(eventDoc);
  });

  it('updates event delegating to service.update', async () => {
    const eventDoc = buildEventDoc();
    const dto = { fee: 600000 };
    mockService.update.mockResolvedValue(eventDoc);

    const result = await controller.update(FIXED_EVENT_ID, dto, mockAdmin);

    expect(mockService.update).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(eventDoc);
  });

  it('updates event status delegating to service.setStatus', async () => {
    const eventDoc = buildEventDoc({ status: ActiveStatus.ACTIVE });
    mockService.setStatus.mockResolvedValue(eventDoc);

    const result = await controller.setStatus(
      FIXED_EVENT_ID,
      { status: ActiveStatus.ACTIVE },
      mockAdmin,
    );

    expect(mockService.setStatus).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      ActiveStatus.ACTIVE,
      mockAdmin,
    );
    expect(result).toEqual(eventDoc);
  });

  it('deletes event delegating to service.delete', async () => {
    mockService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_EVENT_ID, mockAdmin);

    expect(mockService.delete).toHaveBeenCalledWith(FIXED_EVENT_ID, mockAdmin);
    expect(result).toEqual({ success: true });
  });

  it('lists registrations for an event delegating to service.listRegistrations', async () => {
    const regDoc = buildEventRegistrationDoc();
    mockService.listRegistrations.mockResolvedValue({
      data: [regDoc],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    const result = await controller.listRegistrations(
      FIXED_EVENT_ID,
      { page: 1, limit: 50 },
      mockAdmin,
    );

    expect(mockService.listRegistrations).toHaveBeenCalledWith(
      FIXED_EVENT_ID,
      { page: 1, limit: 50 },
      mockAdmin,
    );
    expect(result.data).toHaveLength(1);
  });

  it('marks registration attended delegating to service.markAttended', async () => {
    const regDoc = buildEventRegistrationDoc({ attended: true });
    const dto = { attended: true };
    mockService.markAttended.mockResolvedValue(regDoc);

    const result = await controller.markAttended(
      FIXED_REGISTRATION_ID,
      dto,
      mockAdmin,
    );

    expect(mockService.markAttended).toHaveBeenCalledWith(
      FIXED_REGISTRATION_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(regDoc);
  });

  it('marks registration paid delegating to service.markPaid', async () => {
    const regDoc = buildEventRegistrationDoc();
    const dto = { reference: 'REF-123' };
    mockService.markPaid.mockResolvedValue(regDoc);

    const result = await controller.markPaid(
      FIXED_REGISTRATION_ID,
      dto,
      mockAdmin,
    );

    expect(mockService.markPaid).toHaveBeenCalledWith(
      FIXED_REGISTRATION_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(regDoc);
  });

  it('deletes registration delegating to service.deleteRegistration', async () => {
    mockService.deleteRegistration.mockResolvedValue({ success: true });

    const result = await controller.deleteRegistration(
      FIXED_REGISTRATION_ID,
      mockAdmin,
    );

    expect(mockService.deleteRegistration).toHaveBeenCalledWith(
      FIXED_REGISTRATION_ID,
      mockAdmin,
    );
    expect(result).toEqual({ success: true });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { Event, EventType } from '../event.schema';
import { EventRegistration } from '../event-registration.schema';
import { User, UserStatus } from '../../user/user.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import {
  buildEventDoc,
  buildEventModelMock,
  buildEventRegistrationDoc,
  buildEventRegistrationModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_EVENT_ID,
  FIXED_REGISTRATION_ID,
  FIXED_USER_ID,
} from './__test-helpers__/event-test-fixtures';
import { EventTimeFilter } from '../dtos/list-events.dto';

describe('EventService', () => {
  let service: EventService;
  let mockEventModel: ReturnType<typeof buildEventModelMock>;
  let mockEventRegistrationModel: ReturnType<
    typeof buildEventRegistrationModelMock
  >;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    mockEventModel = buildEventModelMock();
    mockEventRegistrationModel = buildEventRegistrationModelMock();
    mockUserModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
        {
          provide: getModelToken(EventRegistration.name),
          useValue: mockEventRegistrationModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllActive', () => {
    it('returns active upcoming events sorted ascending by startsAt with taken seats', async () => {
      const eventDoc = buildEventDoc({ _id: FIXED_EVENT_ID as any, capacity: 20 });
      mockEventModel.find.mockReturnValue(buildQueryChain([eventDoc]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(1));
      mockEventRegistrationModel.aggregate.mockResolvedValue([
        { _id: FIXED_EVENT_ID, count: 5 },
      ]);

      const result = await service.findAllActive({ page: 1, limit: 10 });

      expect(mockEventModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ActiveStatus.ACTIVE,
          startsAt: expect.objectContaining({ $gte: expect.any(Date) }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].event).toEqual(eventDoc);
      expect(result.data[0].taken).toBe(5);
      expect(result.data[0].isFull).toBe(false);
      expect(result.data[0].isRegistered).toBe(false);
    });

    it('filters past events when time is PAST', async () => {
      const pastEvent = buildEventDoc({
        // Relative date keeps the suite repeatable regardless of wall-clock year.
        startsAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      });
      mockEventModel.find.mockReturnValue(buildQueryChain([pastEvent]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(1));
      mockEventRegistrationModel.aggregate.mockResolvedValue([]);

      const result = await service.findAllActive({
        time: EventTimeFilter.PAST,
      });

      expect(mockEventModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ActiveStatus.ACTIVE,
          startsAt: expect.objectContaining({ $lt: expect.any(Date) }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('filters by event type when provided', async () => {
      mockEventModel.find.mockReturnValue(buildQueryChain([]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(0));
      mockEventRegistrationModel.aggregate.mockResolvedValue([]);

      await service.findAllActive({ type: EventType.CONFERENCE });

      expect(mockEventModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.CONFERENCE,
        }),
      );
    });

    it('resolves user registration status if userId is provided', async () => {
      const eventDoc = buildEventDoc({ _id: FIXED_EVENT_ID as any });
      const regDoc = buildEventRegistrationDoc({
        event: FIXED_EVENT_ID as any,
        user: FIXED_USER_ID as any,
      });

      mockEventModel.find.mockReturnValue(buildQueryChain([eventDoc]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(1));
      mockEventRegistrationModel.aggregate.mockResolvedValue([
        { _id: FIXED_EVENT_ID, count: 1 },
      ]);
      mockEventRegistrationModel.find.mockReturnValue(
        buildQueryChain([regDoc]),
      );

      const result = await service.findAllActive(
        { page: 1, limit: 10 },
        FIXED_USER_ID,
      );

      expect(result.data[0].isRegistered).toBe(true);
      expect(result.data[0].userRegistration).toEqual(regDoc);
    });
  });

  describe('findById', () => {
    it('returns event details with capacity and user registration status', async () => {
      const eventDoc = buildEventDoc({ capacity: 10 });
      const regDoc = buildEventRegistrationDoc();

      mockEventModel.findOne.mockReturnValue(buildQueryChain(eventDoc));
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(10),
      );
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(regDoc),
      );

      const result = await service.findById(FIXED_EVENT_ID, FIXED_USER_ID);

      expect(result.event).toEqual(eventDoc);
      expect(result.taken).toBe(10);
      expect(result.isFull).toBe(true);
      expect(result.isRegistered).toBe(true);
      expect(result.userRegistration).toEqual(regDoc);
    });

    it('throws NotFoundException if event is not found or inactive', async () => {
      mockEventModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_EVENT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('register', () => {
    it('successfully registers an active member for a free event (paymentStatus NONE)', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc({ fee: 0, capacity: 50 });
      const createdReg = buildEventRegistrationDoc({
        paymentStatus: PaymentStatus.NONE,
      });

      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(null),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(10),
      );
      mockEventRegistrationModel.create.mockResolvedValue(createdReg);
      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(createdReg),
      );

      const result = await service.register(FIXED_EVENT_ID, FIXED_USER_ID);

      expect(mockEventRegistrationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: PaymentStatus.NONE,
          attended: false,
        }),
      );
      expect(result).toEqual(createdReg);
    });

    it('successfully registers an active member for a paid event (paymentStatus PENDING)', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc({ fee: 750000, capacity: 50 });
      const createdReg = buildEventRegistrationDoc({
        paymentStatus: PaymentStatus.PENDING,
      });

      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(null),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(5),
      );
      mockEventRegistrationModel.create.mockResolvedValue(createdReg);
      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(createdReg),
      );

      const result = await service.register(FIXED_EVENT_ID, FIXED_USER_ID);

      expect(mockEventRegistrationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: PaymentStatus.PENDING,
        }),
      );
      expect(result).toEqual(createdReg);
    });

    it('throws NotFoundException if user is not found', async () => {
      mockUserModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user status is not ACTIVE', async () => {
      const user = buildUserFixture({ status: UserStatus.REGISTERING });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if event is not found', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if event is inactive/disabled', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc({ status: ActiveStatus.DISABLED });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if member is already registered', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc();
      const existingReg = buildEventRegistrationDoc();

      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(existingReg),
      );

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if event capacity is full', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc({ capacity: 20 });

      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(null),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(20),
      );

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles MongoDB duplicate key error code 11000 with ConflictException', async () => {
      const user = buildUserFixture({ status: UserStatus.ACTIVE });
      const event = buildEventDoc({ capacity: 100 });

      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockEventModel.findById.mockReturnValue(buildQueryChain(event));
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(null),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(5),
      );
      mockEventRegistrationModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.register(FIXED_EVENT_ID, FIXED_USER_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findUserRegistrations', () => {
    it('returns paginated registrations for the current member', async () => {
      const reg1 = buildEventRegistrationDoc();
      const reg2 = buildEventRegistrationDoc({
        _id: '507f1f77bcf86cd799439099' as any,
      });

      mockEventRegistrationModel.find.mockReturnValue(
        buildQueryChain([reg1, reg2]),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(2),
      );

      const result = await service.findUserRegistrations(FIXED_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filters registrations by event type', async () => {
      mockEventModel.find.mockReturnValue(
        buildQueryChain([{ _id: FIXED_EVENT_ID }]),
      );
      mockEventRegistrationModel.find.mockReturnValue(buildQueryChain([]));
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(0),
      );

      await service.findUserRegistrations(FIXED_USER_ID, {
        type: EventType.WORKSHOP,
      });

      expect(mockEventModel.find).toHaveBeenCalledWith({
        type: EventType.WORKSHOP,
      });
      expect(mockEventRegistrationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          event: { $in: [FIXED_EVENT_ID] },
        }),
      );
    });
  });

  describe('findUserRegistrationById', () => {
    it('returns registration if owned by user', async () => {
      const reg = buildEventRegistrationDoc();
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(reg),
      );

      const result = await service.findUserRegistrationById(
        FIXED_REGISTRATION_ID,
        FIXED_USER_ID,
      );

      expect(result).toEqual(reg);
    });

    it('throws NotFoundException if registration not found or belongs to another user', async () => {
      mockEventRegistrationModel.findOne.mockReturnValue(
        buildQueryChain(null),
      );

      await expect(
        service.findUserRegistrationById(FIXED_REGISTRATION_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventAdminService } from './event-admin.service';
import { Event, EventType } from '../event.schema';
import { EventRegistration } from '../event-registration.schema';
import { User, UserRole } from '../../user/user.schema';
import {
  Payment,
  PaymentKind,
  PaymentMethod,
  PaymentSource,
} from '../../payment/payment.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { AuthenticatedUser } from '../../auth/types';
import {
  buildEventDoc,
  buildEventModelMock,
  buildEventRegistrationDoc,
  buildEventRegistrationModelMock,
  buildPaymentModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_EVENT_ID,
  FIXED_PROVINCE_ID,
  FIXED_REGISTRATION_ID,
  FIXED_USER_ID,
  OTHER_PROVINCE_ID,
} from './__test-helpers__/event-test-fixtures';

const buildSuperAdmin = (): AuthenticatedUser => ({
  id: 'admin-super-1',
  mobile: '+989120000001',
  roles: [UserRole.SUPER_ADMIN],
  province: FIXED_PROVINCE_ID,
  jti: 'super-jti',
});

const buildProvinceAdmin = (
  managed = [FIXED_PROVINCE_ID],
): AuthenticatedUser => ({
  id: 'admin-province-1',
  mobile: '+989120000002',
  roles: [UserRole.PROVINCE_ADMIN],
  province: FIXED_PROVINCE_ID,
  managedProvinces: managed,
  jti: 'prov-jti',
});

describe('EventAdminService', () => {
  let service: EventAdminService;
  let mockEventModel: ReturnType<typeof buildEventModelMock>;
  let mockEventRegistrationModel: ReturnType<
    typeof buildEventRegistrationModelMock
  >;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockPaymentModel: ReturnType<typeof buildPaymentModelMock>;

  beforeEach(async () => {
    mockEventModel = buildEventModelMock();
    mockEventRegistrationModel = buildEventRegistrationModelMock();
    mockUserModel = buildUserModelMock();
    mockPaymentModel = buildPaymentModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAdminService,
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
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
      ],
    }).compile();

    service = module.get<EventAdminService>(EventAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all events for super admin with registration count', async () => {
      const eventDoc = buildEventDoc({ _id: FIXED_EVENT_ID as any });
      mockEventModel.find.mockReturnValue(buildQueryChain([eventDoc]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(1));
      mockEventRegistrationModel.aggregate.mockResolvedValue([
        { _id: FIXED_EVENT_ID, count: 12 },
      ]);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        buildSuperAdmin(),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].event).toEqual(eventDoc);
      expect(result.data[0].registrationCount).toBe(12);
    });

    it('scopes results to managedProvinces for PROVINCE_ADMIN', async () => {
      mockEventModel.find.mockReturnValue(buildQueryChain([]));
      mockEventModel.countDocuments.mockReturnValue(buildQueryChain(0));
      mockEventRegistrationModel.aggregate.mockResolvedValue([]);

      await service.findAll({}, buildProvinceAdmin([FIXED_PROVINCE_ID]));

      expect(mockEventModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          province: {
            $in: [expect.any(Object)],
          },
        }),
      );
    });

    it('returns empty result when PROVINCE_ADMIN queries an unmanaged province', async () => {
      const result = await service.findAll(
        { province: OTHER_PROVINCE_ID },
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('retrieves event by ID with registration count', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID });
      mockEventModel.findById.mockReturnValue(buildQueryChain(eventDoc));
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(8),
      );

      const result = await service.findById(
        FIXED_EVENT_ID,
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(result.event).toEqual(eventDoc);
      expect(result.registrationCount).toBe(8);
    });

    it('throws ForbiddenException if PROVINCE_ADMIN attempts to access event outside scope', async () => {
      const eventDoc = buildEventDoc({ province: OTHER_PROVINCE_ID });
      mockEventModel.findById.mockReturnValue(buildQueryChain(eventDoc));

      await expect(
        service.findById(FIXED_EVENT_ID, buildProvinceAdmin([FIXED_PROVINCE_ID])),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if event does not exist', async () => {
      mockEventModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findById(FIXED_EVENT_ID, buildSuperAdmin()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('allows super admin to create a national event (no province)', async () => {
      const created = buildEventDoc({ province: undefined });
      mockEventModel.create.mockResolvedValue(created);
      mockEventModel.findById.mockReturnValue(buildQueryChain(created));

      const result = await service.create(
        {
          type: EventType.WORKSHOP,
          title: { en: 'National Workshop', fa: 'کارگاه ملی' },
          description: { en: 'Desc', fa: 'توضیحات' },
          startsAt: new Date('2026-11-20T09:00:00.000Z'),
          fee: 0,
        },
        buildSuperAdmin(),
      );

      expect(mockEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.WORKSHOP,
          province: undefined,
        }),
      );
      expect(result).toEqual(created);
    });

    it('allows PROVINCE_ADMIN to create an event in their managed province', async () => {
      const created = buildEventDoc({ province: FIXED_PROVINCE_ID });
      mockEventModel.create.mockResolvedValue(created);
      mockEventModel.findById.mockReturnValue(buildQueryChain(created));

      const result = await service.create(
        {
          type: EventType.WORKSHOP,
          title: { en: 'Provincial Workshop', fa: 'کارگاه استانی' },
          description: { en: 'Desc', fa: 'توضیحات' },
          startsAt: new Date('2026-11-20T09:00:00.000Z'),
          province: FIXED_PROVINCE_ID,
          fee: 500000,
        },
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(result).toEqual(created);
    });

    it('rejects PROVINCE_ADMIN attempting to create a national event (missing province)', async () => {
      await expect(
        service.create(
          {
            type: EventType.WORKSHOP,
            title: { en: 'National Workshop', fa: 'کارگاه ملی' },
            description: { en: 'Desc', fa: 'توضیحات' },
            startsAt: new Date('2026-11-20T09:00:00.000Z'),
            fee: 0,
          },
          buildProvinceAdmin([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects PROVINCE_ADMIN attempting to create an event in an unmanaged province', async () => {
      await expect(
        service.create(
          {
            type: EventType.WORKSHOP,
            title: { en: 'Other Province Workshop', fa: 'کارگاه' },
            description: { en: 'Desc', fa: 'توضیحات' },
            startsAt: new Date('2026-11-20T09:00:00.000Z'),
            province: OTHER_PROVINCE_ID,
            fee: 0,
          },
          buildProvinceAdmin([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates event properties and saves', async () => {
      const existing = buildEventDoc({ province: FIXED_PROVINCE_ID });
      mockEventModel.findById.mockReturnValue(buildQueryChain(existing));

      const result = await service.update(
        FIXED_EVENT_ID,
        {
          fee: 600000,
          published: true,
        },
        buildSuperAdmin(),
      );

      expect(existing.fee).toBe(600000);
      expect(existing.status).toBe(ActiveStatus.ACTIVE);
      expect(existing.save).toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('throws ForbiddenException if PROVINCE_ADMIN updates unmanaged event', async () => {
      const existing = buildEventDoc({ province: OTHER_PROVINCE_ID });
      mockEventModel.findById.mockReturnValue(buildQueryChain(existing));

      await expect(
        service.update(
          FIXED_EVENT_ID,
          { fee: 600000 },
          buildProvinceAdmin([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setStatus', () => {
    it('updates event active status', async () => {
      const existing = buildEventDoc({ status: ActiveStatus.DISABLED });
      mockEventModel.findById.mockReturnValue(buildQueryChain(existing));

      const result = await service.setStatus(
        FIXED_EVENT_ID,
        ActiveStatus.ACTIVE,
        buildSuperAdmin(),
      );

      expect(existing.status).toBe(ActiveStatus.ACTIVE);
      expect(existing.save).toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('delete', () => {
    it('deletes event and associated registrations', async () => {
      const existing = buildEventDoc({ province: FIXED_PROVINCE_ID });
      mockEventModel.findById.mockReturnValue(buildQueryChain(existing));
      mockEventModel.findByIdAndDelete.mockReturnValue(buildQueryChain(true));
      mockEventRegistrationModel.deleteMany.mockReturnValue(
        buildQueryChain(true),
      );

      const result = await service.delete(FIXED_EVENT_ID, buildSuperAdmin());

      expect(mockEventModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_EVENT_ID,
      );
      expect(mockEventRegistrationModel.deleteMany).toHaveBeenCalledWith({
        event: existing._id,
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('listRegistrations', () => {
    it('lists registrations for an event with user details', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID });
      const regDoc = buildEventRegistrationDoc();

      mockEventModel.findById.mockReturnValue(buildQueryChain(eventDoc));
      mockEventRegistrationModel.find.mockReturnValue(
        buildQueryChain([regDoc]),
      );
      mockEventRegistrationModel.countDocuments.mockReturnValue(
        buildQueryChain(1),
      );

      const result = await service.listRegistrations(
        FIXED_EVENT_ID,
        { page: 1, limit: 50 },
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('markAttended', () => {
    it('marks attendance and updates certificate', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID });
      const regDoc = buildEventRegistrationDoc({
        event: eventDoc as any,
        attended: false,
      });

      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(regDoc),
      );

      const result = await service.markAttended(
        FIXED_REGISTRATION_ID,
        {
          attended: true,
          certificate: { key: 'certs/user-cert.pdf' },
        },
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(regDoc.attended).toBe(true);
      expect(regDoc.certificate).toEqual(
        expect.objectContaining({ key: 'certs/user-cert.pdf' }),
      );
      expect(regDoc.save).toHaveBeenCalled();
      expect(result).toEqual(regDoc);
    });
  });

  describe('markPaid', () => {
    it('marks registration as PAID and logs transaction in Payment ledger', async () => {
      const eventDoc = buildEventDoc({
        province: FIXED_PROVINCE_ID,
        fee: 500000,
        title: { en: 'Workshop' },
      });
      const userDoc = buildUserFixture();
      const regDoc = buildEventRegistrationDoc({
        event: eventDoc as any,
        user: userDoc as any,
        paymentStatus: PaymentStatus.PENDING,
      });

      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(regDoc),
      );
      mockPaymentModel.create.mockResolvedValue({ _id: 'pay-1' });

      const admin = buildProvinceAdmin([FIXED_PROVINCE_ID]);
      const result = await service.markPaid(
        FIXED_REGISTRATION_ID,
        { reference: 'TRX-9988', note: 'Cash payment' },
        admin,
      );

      expect(mockPaymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: PaymentKind.PAYMENT,
          amount: 500000,
          source: PaymentSource.EVENT,
          sourceId: regDoc._id,
          method: PaymentMethod.OFFLINE,
          reference: 'TRX-9988',
          note: 'Cash payment',
        }),
      );
      expect(regDoc.paymentStatus).toBe(PaymentStatus.PAID);
      expect(regDoc.save).toHaveBeenCalled();
      expect(result).toEqual(regDoc);
    });

    it('throws BadRequestException if registration is already paid', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID });
      const regDoc = buildEventRegistrationDoc({
        event: eventDoc as any,
        paymentStatus: PaymentStatus.PAID,
      });

      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(regDoc),
      );

      await expect(
        service.markPaid(
          FIXED_REGISTRATION_ID,
          {},
          buildProvinceAdmin([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if registration is not in PENDING payment status', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID, fee: 0 });
      const regDoc = buildEventRegistrationDoc({
        event: eventDoc as any,
        paymentStatus: PaymentStatus.NONE,
      });

      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(regDoc),
      );

      await expect(
        service.markPaid(
          FIXED_REGISTRATION_ID,
          {},
          buildProvinceAdmin([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRegistration', () => {
    it('deletes an event registration', async () => {
      const eventDoc = buildEventDoc({ province: FIXED_PROVINCE_ID });
      const regDoc = buildEventRegistrationDoc({ event: eventDoc as any });

      mockEventRegistrationModel.findById.mockReturnValue(
        buildQueryChain(regDoc),
      );
      mockEventRegistrationModel.findByIdAndDelete.mockReturnValue(
        buildQueryChain(true),
      );

      const result = await service.deleteRegistration(
        FIXED_REGISTRATION_ID,
        buildProvinceAdmin([FIXED_PROVINCE_ID]),
      );

      expect(mockEventRegistrationModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_REGISTRATION_ID,
      );
      expect(result).toEqual({ success: true });
    });
  });
});

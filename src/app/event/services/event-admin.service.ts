import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Event, EventProp } from '../event.schema';
import {
  EventRegistration,
  EventRegistrationProp,
} from '../event-registration.schema';
import { User, UserProp, UserRole } from '../../user/user.schema';
import { ProvinceProp } from '../../../common/schemas/province.schema';
import {
  Payment,
  PaymentKind,
  PaymentMethod,
  PaymentSource,
} from '../../payment/payment.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AuthenticatedUser } from '../../auth/types';
import {
  AdminEventItem,
  IEventAdminService,
  PaginatedAdminEventRegistrations,
  PaginatedAdminEvents,
} from '../interfaces/event-admin-service.interface';
import { AdminListEventsDto } from '../dtos/admin-list-events.dto';
import { AdminListEventRegistrationsDto } from '../dtos/admin-list-event-registrations.dto';
import { CreateEventDto } from '../dtos/create-event.dto';
import { UpdateEventDto } from '../dtos/update-event.dto';
import { MarkAttendedDto } from '../dtos/mark-attended.dto';
import { MarkPaidEventRegistrationDto } from '../dtos/mark-paid-event-registration.dto';
import { EventTimeFilter } from '../dtos/list-events.dto';

export function idToString(id: unknown): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof (id as { _id?: unknown })._id !== 'undefined') {
    return (id as { _id?: unknown })._id?.toString() ?? '';
  }
  if (typeof (id as { toString?: () => string }).toString === 'function') {
    return (id as { toString: () => string }).toString();
  }
  return String(id);
}

/**
 * Administrative Event Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative event lifecycle management, provincial scoping,
 * participant attendance tracking, certificate issuance, and offline payment recording.
 */
@Injectable()
export class EventAdminService implements IEventAdminService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<Event>,
    @InjectModel(EventRegistration.name)
    private readonly eventRegistrationModel: Model<EventRegistration>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
  ) {}

  /**
   * Lists events with pagination, status, type, province, and search filters.
   * Enforces provincial scoping for PROVINCE_ADMIN.
   */
  async findAll(
    query?: AdminListEventsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminEvents> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<Event> = {};

    if (query?.type) {
      filter.type = query.type;
    }

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.time) {
      const now = new Date();
      if (query.time === EventTimeFilter.PAST) {
        filter.startsAt = { $lt: now };
      } else {
        filter.startsAt = { $gte: now };
      }
    }

    // Provincial scoping
    const isSuper = admin?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    const isProvinceAdmin = admin?.roles?.includes(UserRole.PROVINCE_ADMIN);

    const managedProvinceIds =
      isProvinceAdmin && !isSuper && admin?.managedProvinces
        ? admin.managedProvinces.map((p) => idToString(p))
        : undefined;

    if (query?.province) {
      const qProvince = idToString(query.province);
      if (managedProvinceIds && !managedProvinceIds.includes(qProvince)) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      filter.province = new Types.ObjectId(qProvince);
    } else if (managedProvinceIds) {
      filter.province = {
        $in: managedProvinceIds.map((p) => new Types.ObjectId(p)),
      };
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'title.en': regex },
        { 'title.fa': regex },
        { 'description.en': regex },
        { 'description.fa': regex },
        { 'location.en': regex },
        { 'location.fa': regex },
      ];
    }

    const [events, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .select(EventProp.admin)
        .populate('province', ProvinceProp.general)
        .sort({ startsAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.eventModel.countDocuments(filter).exec(),
    ]);

    const eventIds = events.map((e) => e._id);

    const registrationCounts = await this.eventRegistrationModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { event: { $in: eventIds } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);

    const countsMap = new Map<string, number>();
    for (const r of registrationCounts) {
      countsMap.set(r._id.toString(), r.count);
    }

    const data: AdminEventItem[] = events.map((event) => ({
      event,
      registrationCount: countsMap.get(event._id.toString()) ?? 0,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves an event by ID with registration statistics, asserting province scope.
   */
  async findById(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<AdminEventItem> {
    const event = await this.eventModel
      .findById(id)
      .select(EventProp.admin)
      .populate('province', ProvinceProp.general)
      .exec();

    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    this.assertProvinceScope(event.province, admin);

    const registrationCount = await this.eventRegistrationModel
      .countDocuments({ event: event._id })
      .exec();

    return { event, registrationCount };
  }

  /**
   * Creates a new workshop or conference with provincial scoping.
   */
  async create(dto: CreateEventDto, admin?: AuthenticatedUser): Promise<Event> {
    const isSuper = admin?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );

    const provinceId: string | undefined = dto.province
      ? idToString(dto.province)
      : undefined;

    if (!isSuper) {
      if (!provinceId) {
        throw new BadRequestException(
          translate('errors.CANNOT_CREATE_NATIONAL_EVENT'),
        );
      }
      this.assertProvinceScope(provinceId, admin);
    }

    let status = dto.status ?? ActiveStatus.DISABLED;
    if (dto.published !== undefined) {
      status = dto.published ? ActiveStatus.ACTIVE : ActiveStatus.DISABLED;
    }

    const created = await this.eventModel.create({
      type: dto.type,
      title: dto.title,
      description: dto.description,
      startsAt: new Date(dto.startsAt),
      location: dto.location,
      capacity: dto.capacity ?? undefined,
      fee: dto.fee ?? 0,
      poster: dto.poster ? toMediaFile(dto.poster) : undefined,
      province: provinceId ? new Types.ObjectId(provinceId) : undefined,
      status,
      createdAt: new Date(),
    });

    return (await this.eventModel
      .findById(created._id)
      .select(EventProp.admin)
      .populate('province', ProvinceProp.general)
      .exec()) as unknown as Event;
  }

  /**
   * Updates an existing event, verifying province ownership before and after.
   */
  async update(
    id: string,
    dto: UpdateEventDto,
    admin?: AuthenticatedUser,
  ): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    this.assertProvinceScope(event.province, admin);

    if (dto.province !== undefined) {
      const isSuper = admin?.roles?.some(
        (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
      );
      const newProvinceId = dto.province ? idToString(dto.province) : undefined;

      if (!isSuper) {
        if (!newProvinceId) {
          throw new BadRequestException(
            translate('errors.CANNOT_CREATE_NATIONAL_EVENT'),
          );
        }
        this.assertProvinceScope(newProvinceId, admin);
      }
      event.province = (newProvinceId
        ? new Types.ObjectId(newProvinceId)
        : undefined) as unknown as Event['province'];
    }

    if (dto.type) event.type = dto.type;
    if (dto.title) event.title = dto.title;
    if (dto.description) event.description = dto.description;
    if (dto.startsAt) event.startsAt = new Date(dto.startsAt);
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.capacity !== undefined) event.capacity = dto.capacity;
    if (dto.fee !== undefined) event.fee = dto.fee;
    if (dto.poster !== undefined) {
      event.poster = dto.poster ? toMediaFile(dto.poster) : undefined;
    }

    if (dto.published !== undefined) {
      event.status = dto.published
        ? ActiveStatus.ACTIVE
        : ActiveStatus.DISABLED;
    } else if (dto.status) {
      event.status = dto.status;
    }

    await event.save();

    return (await this.eventModel
      .findById(event._id)
      .select(EventProp.admin)
      .populate('province', ProvinceProp.general)
      .exec()) as unknown as Event;
  }

  /**
   * Sets the active/published status of an event.
   */
  async setStatus(
    id: string,
    status: ActiveStatus,
    admin?: AuthenticatedUser,
  ): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    this.assertProvinceScope(event.province, admin);

    event.status = status;
    await event.save();

    return (await this.eventModel
      .findById(event._id)
      .select(EventProp.admin)
      .populate('province', ProvinceProp.general)
      .exec()) as unknown as Event;
  }

  /**
   * Deletes an event and its associated registrations.
   */
  async delete(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    this.assertProvinceScope(event.province, admin);

    await Promise.all([
      this.eventModel.findByIdAndDelete(id).exec(),
      this.eventRegistrationModel.deleteMany({ event: event._id }).exec(),
    ]);

    return { success: true };
  }

  /**
   * Lists all registrations for a specific event with attendance and payment filters.
   */
  async listRegistrations(
    eventId: string,
    query?: AdminListEventRegistrationsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminEventRegistrations> {
    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    this.assertProvinceScope(event.province, admin);

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<EventRegistration> = {
      event: event._id,
    };

    if (query?.attended !== undefined) {
      filter.attended = query.attended;
    }

    if (query?.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const matchingUsers = await this.userModel
        .find({
          $or: [
            { fullName: regex },
            { latinFullName: regex },
            { mobile: regex },
            { nationalCode: regex },
            { email: regex },
          ],
        })
        .select('_id')
        .exec();

      const userIds = matchingUsers.map((u) => u._id);
      filter.user = { $in: userIds };
    }

    const [data, total] = await Promise.all([
      this.eventRegistrationModel
        .find(filter)
        .select(EventRegistrationProp.admin)
        .populate({
          path: 'user',
          select: UserProp.admin,
          populate: { path: 'province', select: ProvinceProp.general },
        })
        .populate({
          path: 'event',
          select: EventProp.admin,
          populate: { path: 'province', select: ProvinceProp.general },
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.eventRegistrationModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Marks a member as attended for an event and optionally attaches their certificate.
   */
  async markAttended(
    registrationId: string,
    dto: MarkAttendedDto,
    admin?: AuthenticatedUser,
  ): Promise<EventRegistration> {
    const registration = await this.eventRegistrationModel
      .findById(registrationId)
      .populate('event')
      .populate('user')
      .exec();

    if (!registration) {
      throw new NotFoundException(
        translate('errors.EVENT_REGISTRATION_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(registration.event?.province, admin);

    registration.attended = dto.attended;
    if (dto.certificate) {
      registration.certificate = toMediaFile(dto.certificate);
    }

    await registration.save();

    return (await this.eventRegistrationModel
      .findById(registration._id)
      .select(EventRegistrationProp.admin)
      .populate({
        path: 'user',
        select: UserProp.admin,
        populate: { path: 'province', select: ProvinceProp.general },
      })
      .populate({
        path: 'event',
        select: EventProp.admin,
        populate: { path: 'province', select: ProvinceProp.general },
      })
      .exec()) as unknown as EventRegistration;
  }

  /**
   * Confirms an offline payment for an event registration and logs the transaction in the Payment ledger.
   */
  async markPaid(
    registrationId: string,
    dto: MarkPaidEventRegistrationDto,
    admin?: AuthenticatedUser,
  ): Promise<EventRegistration> {
    const registration = await this.eventRegistrationModel
      .findById(registrationId)
      .populate('event')
      .populate('user')
      .exec();

    if (!registration) {
      throw new NotFoundException(
        translate('errors.EVENT_REGISTRATION_NOT_FOUND'),
      );
    }

    const event = registration.event;
    this.assertProvinceScope(event?.province, admin);

    if (registration.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(
        translate('errors.EVENT_REGISTRATION_ALREADY_PAID'),
      );
    }

    if (registration.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.EVENT_REGISTRATION_NOT_PENDING_PAYMENT'),
      );
    }

    const user = registration.user;

    // Record settled payment in ledger
    await this.paymentModel.create({
      kind: PaymentKind.PAYMENT,
      amount: event?.fee ?? 0,
      source: PaymentSource.EVENT,
      sourceId: registration._id,
      user: user?._id ?? registration.user,
      province: event?.province ?? user?.province,
      description: event?.title,
      method: PaymentMethod.OFFLINE,
      reference: dto?.reference?.trim(),
      confirmedBy:
        admin?.id && Types.ObjectId.isValid(admin.id)
          ? new Types.ObjectId(admin.id)
          : undefined,
      paidAt: new Date(),
      note: dto?.note?.trim(),
    });

    registration.paymentStatus = PaymentStatus.PAID;
    await registration.save();

    return (await this.eventRegistrationModel
      .findById(registration._id)
      .select(EventRegistrationProp.admin)
      .populate({
        path: 'user',
        select: UserProp.admin,
        populate: { path: 'province', select: ProvinceProp.general },
      })
      .populate({
        path: 'event',
        select: EventProp.admin,
        populate: { path: 'province', select: ProvinceProp.general },
      })
      .exec()) as unknown as EventRegistration;
  }

  /**
   * Deletes an event registration.
   */
  async deleteRegistration(
    registrationId: string,
    admin?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const registration = await this.eventRegistrationModel
      .findById(registrationId)
      .populate('event')
      .exec();

    if (!registration) {
      throw new NotFoundException(
        translate('errors.EVENT_REGISTRATION_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(registration.event?.province, admin);

    await this.eventRegistrationModel.findByIdAndDelete(registrationId).exec();
    return { success: true };
  }

  /**
   * Asserts that if the admin is province-scoped (PROVINCE_ADMIN), they are authorized
   * for the event's province.
   */
  private assertProvinceScope(
    province: unknown,
    admin?: AuthenticatedUser,
  ): void {
    if (!admin) return;

    const isSuper = admin.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (isSuper) return;

    const isProvinceAdmin = admin.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (isProvinceAdmin && admin.managedProvinces) {
      const targetProvinceId = idToString(province);
      const managed = admin.managedProvinces.map((p) => idToString(p));
      if (!targetProvinceId || !managed.includes(targetProvinceId)) {
        throw new ForbiddenException(
          translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
        );
      }
    }
  }
}

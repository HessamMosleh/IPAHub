import {
  BadRequestException,
  ConflictException,
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
import { User, UserStatus } from '../../user/user.schema';
import { ProvinceProp } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import {
  ClientEventItem,
  IEventService,
  PaginatedClientEvents,
  PaginatedUserRegistrations,
} from '../interfaces/event-service.interface';
import { EventTimeFilter, ListEventsDto } from '../dtos/list-events.dto';
import { ListUserEventRegistrationsDto } from '../dtos/list-user-event-registrations.dto';

/**
 * Public & Member Client Event Service.
 * Adheres to Single Responsibility Principle (SRP) — manages event discovery,
 * capacity checks, participant registration concurrency, and personal registration history.
 */
@Injectable()
export class EventService implements IEventService {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<Event>,
    @InjectModel(EventRegistration.name)
    private readonly eventRegistrationModel: Model<EventRegistration>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Browse published events (workshops/conferences) with upcoming/past filtering,
   * capacity/taken counts, and member registration status.
   */
  async findAllActive(
    query?: ListEventsDto,
    userId?: string,
  ): Promise<PaginatedClientEvents> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    const filter: QueryFilter<Event> = {
      status: ActiveStatus.ACTIVE,
    };

    if (query?.type) {
      filter.type = query.type;
    }

    if (query?.province) {
      filter.province = new Types.ObjectId(query.province);
    }

    const showPast = query?.time === EventTimeFilter.PAST;
    if (showPast) {
      filter.startsAt = { $lt: now };
    } else {
      filter.startsAt = { $gte: now };
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

    const sortOrder: Record<string, 1 | -1> = showPast
      ? { startsAt: -1 }
      : { startsAt: 1 };

    const [events, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .select(EventProp.general)
        .populate('province', ProvinceProp.general)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.eventModel.countDocuments(filter).exec(),
    ]);

    const eventIds = events.map((e) => e._id);

    // Compute taken registrations count for all events in this page
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

    // If member is authenticated, find which events they have registered for
    const userRegistrationsMap = new Map<string, EventRegistration>();
    if (userId) {
      const userRegistrations = await this.eventRegistrationModel
        .find({
          event: { $in: eventIds },
          user: new Types.ObjectId(userId),
        })
        .select(EventRegistrationProp.general)
        .exec();

      for (const reg of userRegistrations) {
        const eventIdStr = reg.event?._id
          ? reg.event._id.toString()
          : reg.event.toString();
        userRegistrationsMap.set(eventIdStr, reg);
      }
    }

    const data: ClientEventItem[] = events.map((event) => {
      const eventIdStr = event._id.toString();
      const taken = countsMap.get(eventIdStr) ?? 0;
      const isFull = event.capacity != null ? taken >= event.capacity : false;
      const userReg = userRegistrationsMap.get(eventIdStr);

      return {
        event,
        taken,
        isFull,
        isRegistered: !!userReg,
        userRegistration: userReg,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieve details of a published event with capacity and registration status.
   */
  async findById(id: string, userId?: string): Promise<ClientEventItem> {
    const event = await this.eventModel
      .findOne({
        _id: new Types.ObjectId(id),
        status: ActiveStatus.ACTIVE,
      })
      .select(EventProp.general)
      .populate('province', ProvinceProp.general)
      .exec();

    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    const taken = await this.eventRegistrationModel
      .countDocuments({ event: event._id })
      .exec();

    const isFull = event.capacity != null ? taken >= event.capacity : false;

    let userRegistration: EventRegistration | undefined;
    if (userId) {
      const reg = await this.eventRegistrationModel
        .findOne({
          event: event._id,
          user: new Types.ObjectId(userId),
        })
        .select(EventRegistrationProp.general)
        .exec();
      if (reg) {
        userRegistration = reg;
      }
    }

    return {
      event,
      taken,
      isFull,
      isRegistered: !!userRegistration,
      userRegistration,
    };
  }

  /**
   * Register the authenticated active member for an event.
   * Enforces active membership, event publication, capacity constraint,
   * and prevents duplicate registrations.
   */
  async register(eventId: string, userId: string): Promise<EventRegistration> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(translate('errors.MEMBERSHIP_NOT_ACTIVE'));
    }

    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException(translate('errors.EVENT_NOT_FOUND'));
    }

    if (event.status !== ActiveStatus.ACTIVE) {
      throw new BadRequestException(translate('errors.EVENT_INACTIVE'));
    }

    // Check duplicate registration
    const existing = await this.eventRegistrationModel
      .findOne({
        event: event._id,
        user: user._id,
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        translate('errors.EVENT_REGISTRATION_DUPLICATE'),
      );
    }

    // Check capacity constraint
    if (event.capacity != null) {
      const taken = await this.eventRegistrationModel
        .countDocuments({ event: event._id })
        .exec();

      if (taken >= event.capacity) {
        throw new BadRequestException(translate('errors.EVENT_FULL'));
      }
    }

    const paymentStatus =
      event.fee > 0 ? PaymentStatus.PENDING : PaymentStatus.NONE;

    try {
      const registration = await this.eventRegistrationModel.create({
        event: event._id,
        user: user._id,
        paymentStatus,
        attended: false,
        createdAt: new Date(),
      });

      return (await this.eventRegistrationModel
        .findById(registration._id)
        .select(EventRegistrationProp.general)
        .populate({
          path: 'event',
          select: EventProp.general,
          populate: { path: 'province', select: ProvinceProp.general },
        })
        .exec()) as unknown as EventRegistration;
    } catch (err: any) {
      if (err?.code === 11000 || err?.name === 'MongoServerError') {
        throw new ConflictException(
          translate('errors.EVENT_REGISTRATION_DUPLICATE'),
        );
      }
      throw err;
    }
  }

  /**
   * List all event registrations for the authenticated member.
   */
  async findUserRegistrations(
    userId: string,
    query?: ListUserEventRegistrationsDto,
  ): Promise<PaginatedUserRegistrations> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<EventRegistration> = {
      user: new Types.ObjectId(userId),
    };

    if (query?.type) {
      const matchingEvents = await this.eventModel
        .find({ type: query.type })
        .select('_id')
        .exec();

      const eventIds = matchingEvents.map((e) => e._id);
      filter.event = { $in: eventIds };
    }

    const [data, total] = await Promise.all([
      this.eventRegistrationModel
        .find(filter)
        .select(EventRegistrationProp.general)
        .populate({
          path: 'event',
          select: EventProp.general,
          populate: { path: 'province', select: ProvinceProp.general },
        })
        .sort({ createdAt: -1 })
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
   * Get a specific event registration receipt belonging to the authenticated member.
   */
  async findUserRegistrationById(
    id: string,
    userId: string,
  ): Promise<EventRegistration> {
    const registration = await this.eventRegistrationModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(EventRegistrationProp.general)
      .populate({
        path: 'event',
        select: EventProp.general,
        populate: { path: 'province', select: ProvinceProp.general },
      })
      .exec();

    if (!registration) {
      throw new NotFoundException(
        translate('errors.EVENT_REGISTRATION_NOT_FOUND'),
      );
    }

    return registration;
  }
}

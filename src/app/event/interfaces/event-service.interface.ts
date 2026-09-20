import { Event } from '../event.schema';
import { EventRegistration } from '../event-registration.schema';
import { ListEventsDto } from '../dtos/list-events.dto';
import { ListUserEventRegistrationsDto } from '../dtos/list-user-event-registrations.dto';

export interface ClientEventItem {
  event: Event;
  taken: number;
  isFull: boolean;
  isRegistered: boolean;
  userRegistration?: EventRegistration;
}

export interface PaginatedClientEvents {
  data: ClientEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedUserRegistrations {
  data: EventRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for public/member client event operations.
 * Adheres to Interface Segregation Principle (ISP) — public and member users
 * can only explore published events, register within capacity limits, and review
 * personal event registrations and certificates.
 */
export interface IEventService {
  /**
   * Browse published events (workshops/conferences) with upcoming/past filtering,
   * capacity/taken counts, and member registration status.
   */
  findAllActive(
    query?: ListEventsDto,
    userId?: string,
  ): Promise<PaginatedClientEvents>;

  /**
   * Retrieve details of a published event with capacity and registration status.
   */
  findById(id: string, userId?: string): Promise<ClientEventItem>;

  /**
   * Register the authenticated active member for an event.
   * Enforces active membership, event publication, capacity constraint,
   * and prevents duplicate registrations.
   */
  register(eventId: string, userId: string): Promise<EventRegistration>;

  /**
   * List all event registrations for the authenticated member.
   */
  findUserRegistrations(
    userId: string,
    query?: ListUserEventRegistrationsDto,
  ): Promise<PaginatedUserRegistrations>;

  /**
   * Get a specific event registration receipt belonging to the authenticated member.
   */
  findUserRegistrationById(
    id: string,
    userId: string,
  ): Promise<EventRegistration>;
}

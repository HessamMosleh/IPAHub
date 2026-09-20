import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { Event } from '../event.schema';
import { EventRegistration } from '../event-registration.schema';
import { AdminListEventsDto } from '../dtos/admin-list-events.dto';
import { AdminListEventRegistrationsDto } from '../dtos/admin-list-event-registrations.dto';
import { CreateEventDto } from '../dtos/create-event.dto';
import { UpdateEventDto } from '../dtos/update-event.dto';
import { MarkAttendedDto } from '../dtos/mark-attended.dto';
import { MarkPaidEventRegistrationDto } from '../dtos/mark-paid-event-registration.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface AdminEventItem {
  event: Event;
  registrationCount: number;
}

export interface PaginatedAdminEvents {
  data: AdminEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedAdminEventRegistrations {
  data: EventRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative event operations.
 * Segregated from client interface (ISP).
 * Provides event creation, updates, provincial scoping, registration management,
 * attendance marking with certificate issuance, and offline payment ledger confirmation.
 */
export interface IEventAdminService {
  /**
   * Lists events with pagination, status, type, province, and search filters.
   * Enforces provincial scoping for PROVINCE_ADMIN.
   */
  findAll(
    query?: AdminListEventsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminEvents>;

  /**
   * Retrieves an event by ID with registration statistics, asserting province scope.
   */
  findById(id: string, admin?: AuthenticatedUser): Promise<AdminEventItem>;

  /**
   * Creates a new workshop or conference with provincial scoping.
   */
  create(dto: CreateEventDto, admin?: AuthenticatedUser): Promise<Event>;

  /**
   * Updates an existing event, verifying province ownership before and after.
   */
  update(
    id: string,
    dto: UpdateEventDto,
    admin?: AuthenticatedUser,
  ): Promise<Event>;

  /**
   * Sets the active/published status of an event.
   */
  setStatus(
    id: string,
    status: ActiveStatus,
    admin?: AuthenticatedUser,
  ): Promise<Event>;

  /**
   * Deletes an event and its associated registrations.
   */
  delete(id: string, admin?: AuthenticatedUser): Promise<{ success: boolean }>;

  /**
   * Lists all registrations for a specific event with attendance and payment filters.
   */
  listRegistrations(
    eventId: string,
    query?: AdminListEventRegistrationsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminEventRegistrations>;

  /**
   * Marks a member as attended for an event and optionally attaches their certificate.
   */
  markAttended(
    registrationId: string,
    dto: MarkAttendedDto,
    admin?: AuthenticatedUser,
  ): Promise<EventRegistration>;

  /**
   * Confirms an offline payment for an event registration and logs the transaction in the Payment ledger.
   */
  markPaid(
    registrationId: string,
    dto: MarkPaidEventRegistrationDto,
    admin?: AuthenticatedUser,
  ): Promise<EventRegistration>;

  /**
   * Deletes an event registration.
   */
  deleteRegistration(
    registrationId: string,
    admin?: AuthenticatedUser,
  ): Promise<{ success: boolean }>;
}

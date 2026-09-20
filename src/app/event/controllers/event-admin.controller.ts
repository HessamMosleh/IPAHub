import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/user.schema';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { EventAdminService } from '../services/event-admin.service';
import { AdminListEventsDto } from '../dtos/admin-list-events.dto';
import { AdminListEventRegistrationsDto } from '../dtos/admin-list-event-registrations.dto';
import { CreateEventDto } from '../dtos/create-event.dto';
import { UpdateEventDto } from '../dtos/update-event.dto';
import { UpdateEventStatusDto } from '../dtos/update-event-status.dto';
import { MarkAttendedDto } from '../dtos/mark-attended.dto';
import { MarkPaidEventRegistrationDto } from '../dtos/mark-paid-event-registration.dto';
import {
  EventResponseDto,
  PaginatedEventsResponseDto,
} from '../dtos/event-response.dto';
import {
  EventRegistrationResponseDto,
  PaginatedEventRegistrationsResponseDto,
} from '../dtos/event-registration-response.dto';

/**
 * Administrative Event Controller.
 * Segregated from the member client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN, ADMIN, PROVINCE_ADMIN).
 */
@ApiTags('Admin - Event')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
@Controller('admin/event')
export class EventAdminController {
  constructor(private readonly eventAdminService: EventAdminService) {}

  @Get()
  @ApiOperation({
    summary:
      'List events with pagination, status, type, province, and search filters',
  })
  @ApiOkResponse({
    type: PaginatedEventsResponseDto,
    description: 'Paginated list of events.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListEventsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedEventsResponseDto> {
    const result = await this.eventAdminService.findAll(query, user);

    const data: EventResponseDto[] = result.data.map((item) => ({
      ...((item.event as unknown as { toObject?: () => Record<string, unknown> })
        .toObject
        ? (
            item.event as unknown as {
              toObject: () => Record<string, unknown>;
            }
          ).toObject()
        : item.event),
      _id: item.event._id.toString(),
      registrationCount: item.registrationCount,
    })) as unknown as EventResponseDto[];

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: EventResponseDto,
    description: 'Event details with registration counts.',
  })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    const item = await this.eventAdminService.findById(id, user);

    return {
      ...((item.event as unknown as { toObject?: () => Record<string, unknown> })
        .toObject
        ? (
            item.event as unknown as {
              toObject: () => Record<string, unknown>;
            }
          ).toObject()
        : item.event),
      _id: item.event._id.toString(),
      registrationCount: item.registrationCount,
    } as unknown as EventResponseDto;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workshop or conference' })
  @ApiOkResponse({
    type: EventResponseDto,
    description: 'The created event.',
  })
  @ApiBadRequestResponse({
    description: 'Province administrators cannot create national events.',
  })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateEventDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    const event = await this.eventAdminService.create(dto, user);
    return event as unknown as EventResponseDto;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing event' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: EventResponseDto,
    description: 'The updated event.',
  })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    const event = await this.eventAdminService.update(id, dto, user);
    return event as unknown as EventResponseDto;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update event status (ACTIVE / DISABLED)' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: EventResponseDto,
    description: 'The event with updated status.',
  })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventResponseDto> {
    const event = await this.eventAdminService.setStatus(id, dto.status, user);
    return event as unknown as EventResponseDto;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event and its registrations' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.eventAdminService.delete(id, user);
  }

  @Get(':id/registrations')
  @ApiOperation({
    summary: 'List participant registrations for an event',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PaginatedEventRegistrationsResponseDto,
    description: 'Paginated list of event registrations.',
  })
  @ApiNotFoundResponse({ description: 'Event not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async listRegistrations(
    @Param('id') id: string,
    @Query() query: AdminListEventRegistrationsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedEventRegistrationsResponseDto> {
    const result = await this.eventAdminService.listRegistrations(
      id,
      query,
      user,
    );
    return result as unknown as PaginatedEventRegistrationsResponseDto;
  }

  @Patch('registrations/:id/attended')
  @ApiOperation({
    summary:
      'Mark a participant as attended and optionally attach completion certificate',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a33' })
  @ApiOkResponse({
    type: EventRegistrationResponseDto,
    description: 'The updated registration receipt.',
  })
  @ApiNotFoundResponse({ description: 'Event registration not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async markAttended(
    @Param('id') id: string,
    @Body() dto: MarkAttendedDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationResponseDto> {
    const registration = await this.eventAdminService.markAttended(
      id,
      dto,
      user,
    );
    return registration as unknown as EventRegistrationResponseDto;
  }

  @Patch('registrations/:id/mark-paid')
  @ApiOperation({
    summary:
      'Confirm offline payment for an event registration and record transaction in payment ledger',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a33' })
  @ApiOkResponse({
    type: EventRegistrationResponseDto,
    description: 'The updated registration receipt with PAID status.',
  })
  @ApiBadRequestResponse({
    description:
      'Registration already paid or not awaiting payment (e.g. free event).',
  })
  @ApiNotFoundResponse({ description: 'Event registration not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidEventRegistrationDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationResponseDto> {
    const registration = await this.eventAdminService.markPaid(id, dto, user);
    return registration as unknown as EventRegistrationResponseDto;
  }

  @Delete('registrations/:id')
  @ApiOperation({ summary: 'Delete an event registration' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a33' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Event registration not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteRegistration(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.eventAdminService.deleteRegistration(id, user);
  }
}

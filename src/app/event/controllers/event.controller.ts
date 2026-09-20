import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { EventService } from '../services/event.service';
import { ListEventsDto } from '../dtos/list-events.dto';
import { ListUserEventRegistrationsDto } from '../dtos/list-user-event-registrations.dto';
import { RegisterEventDto } from '../dtos/register-event.dto';
import {
  ClientEventResponseDto,
  PaginatedClientEventsResponseDto,
} from '../dtos/event-response.dto';
import {
  EventRegistrationResponseDto,
  PaginatedEventRegistrationsResponseDto,
} from '../dtos/event-registration-response.dto';

/**
 * Public and Member Client Event Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles public event discovery,
 * member registration workflow, and personal registration/certificate access.
 */
@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  @ApiOperation({
    summary:
      'List active workshops and conferences with upcoming/past filtering, search, and taken capacity counters',
  })
  @ApiOkResponse({
    type: PaginatedClientEventsResponseDto,
    description: 'Paginated list of active events with capacity information.',
  })
  async findAll(
    @Query() query: ListEventsDto,
    @GetUser() user?: AuthenticatedUser,
  ): Promise<PaginatedClientEventsResponseDto> {
    const result = await this.eventService.findAllActive(query, user?.id);

    const data: ClientEventResponseDto[] = result.data.map((item) => ({
      ...((item.event as unknown as { toObject?: () => Record<string, unknown> })
        .toObject
        ? (
            item.event as unknown as {
              toObject: () => Record<string, unknown>;
            }
          ).toObject()
        : item.event),
      _id: item.event._id.toString(),
      taken: item.taken,
      isFull: item.isFull,
      isRegistered: item.isRegistered,
      userRegistration: item.userRegistration as unknown as
        | EventRegistrationResponseDto
        | undefined,
    })) as unknown as ClientEventResponseDto[];

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('registrations')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: "List current authenticated member's event registrations",
  })
  @ApiOkResponse({
    type: PaginatedEventRegistrationsResponseDto,
    description: 'Paginated list of member event registrations.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findUserRegistrations(
    @Query() query: ListUserEventRegistrationsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedEventRegistrationsResponseDto> {
    const result = await this.eventService.findUserRegistrations(
      user.id,
      query,
    );
    return result as unknown as PaginatedEventRegistrationsResponseDto;
  }

  @Get('registrations/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get a specific event registration receipt and certificate for current member',
  })
  @ApiParam({
    name: 'id',
    description: 'Event registration MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a33',
  })
  @ApiOkResponse({
    type: EventRegistrationResponseDto,
    description: 'The event registration receipt.',
  })
  @ApiNotFoundResponse({ description: 'Event registration not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findUserRegistrationById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationResponseDto> {
    const result = await this.eventService.findUserRegistrationById(
      id,
      user.id,
    );
    return result as unknown as EventRegistrationResponseDto;
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get details of a published workshop or conference with capacity and registration status',
  })
  @ApiParam({
    name: 'id',
    description: 'Event MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: ClientEventResponseDto,
    description: 'The published event details.',
  })
  @ApiNotFoundResponse({ description: 'Event not found or inactive.' })
  async findById(
    @Param('id') id: string,
    @GetUser() user?: AuthenticatedUser,
  ): Promise<ClientEventResponseDto> {
    const item = await this.eventService.findById(id, user?.id);

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
      taken: item.taken,
      isFull: item.isFull,
      isRegistered: item.isRegistered,
      userRegistration: item.userRegistration as unknown as
        | EventRegistrationResponseDto
        | undefined,
    } as unknown as ClientEventResponseDto;
  }

  @Post(':id/register')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Register for an event as an active member',
  })
  @ApiParam({
    name: 'id',
    description: 'Event MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiCreatedResponse({
    type: EventRegistrationResponseDto,
    description: 'Registration successful. Returns registration receipt.',
  })
  @ApiBadRequestResponse({
    description: 'Event is full or inactive.',
  })
  @ApiConflictResponse({
    description: 'Member is already registered for this event.',
  })
  @ApiForbiddenResponse({
    description: 'Membership is not active.',
  })
  @ApiNotFoundResponse({ description: 'User or event not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async registerById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationResponseDto> {
    const registration = await this.eventService.register(id, user.id);
    return registration as unknown as EventRegistrationResponseDto;
  }

  @Post('register')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Register for an event using JSON body payload',
  })
  @ApiCreatedResponse({
    type: EventRegistrationResponseDto,
    description: 'Registration successful. Returns registration receipt.',
  })
  @ApiBadRequestResponse({
    description: 'Event is full, inactive, or eventId is missing.',
  })
  @ApiConflictResponse({
    description: 'Member is already registered for this event.',
  })
  @ApiForbiddenResponse({
    description: 'Membership is not active.',
  })
  @ApiNotFoundResponse({ description: 'User or event not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async registerByBody(
    @Body() dto: RegisterEventDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<EventRegistrationResponseDto> {
    const eventId = dto.eventId;
    if (!eventId) {
      throw new BadRequestException('eventId is required in request body');
    }
    const registration = await this.eventService.register(eventId, user.id);
    return registration as unknown as EventRegistrationResponseDto;
  }
}

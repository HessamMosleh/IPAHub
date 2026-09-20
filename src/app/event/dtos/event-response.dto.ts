import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { ProvinceResponseDto } from '../../province/dtos/province-response.dto';
import { EventType } from '../event.schema';
import { EventRegistrationResponseDto } from './event-registration-response.dto';

export class EventResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({
    enum: EventType,
    example: EventType.WORKSHOP,
    description: 'Event type (workshop or conference)',
  })
  type: EventType;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  description: LocalizedTextDto;

  @ApiProperty({ example: '2026-10-15T09:00:00.000Z' })
  startsAt: Date;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  location?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: Number,
    example: 50,
    description: 'Capacity limit (absent/null = unlimited)',
  })
  capacity?: number;

  @ApiProperty({
    type: Number,
    example: 1000000,
    description: 'Registration fee in Rials (0 = free)',
  })
  fee: number;

  @ApiPropertyOptional({ type: MediaFileDto })
  poster?: MediaFileDto;

  @ApiPropertyOptional({
    type: () => ProvinceResponseDto,
    description: 'Branch province (null = national event)',
  })
  province?: ProvinceResponseDto | string;

  @ApiProperty({
    enum: ActiveStatus,
    example: ActiveStatus.ACTIVE,
  })
  status: ActiveStatus;

  @ApiPropertyOptional({
    type: Number,
    example: 12,
    description: 'Number of registered participants',
  })
  registrationCount?: number;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-20T12:00:00.000Z' })
  updatedAt?: Date;
}

export class ClientEventResponseDto extends EventResponseDto {
  @ApiProperty({
    type: Number,
    example: 15,
    description: 'Number of registered seats taken',
  })
  taken: number;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'True if event has reached capacity limit',
  })
  isFull: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Whether authenticated user is already registered for this event',
  })
  isRegistered?: boolean;

  @ApiPropertyOptional({
    type: () => EventRegistrationResponseDto,
    description: 'User registration receipt if already registered',
  })
  userRegistration?: EventRegistrationResponseDto;
}

export class PaginatedEventsResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  data: EventResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class PaginatedClientEventsResponseDto {
  @ApiProperty({ type: [ClientEventResponseDto] })
  data: ClientEventResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

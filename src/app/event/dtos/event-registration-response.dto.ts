import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { ProvinceResponseDto } from '../../province/dtos/province-response.dto';
import { EventResponseDto } from './event-response.dto';

export class EventRegistrationUserResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a22' })
  _id: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  latinFullName?: string;

  @ApiPropertyOptional({ example: '+989121234567' })
  mobile?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  nationalCode?: string;

  @ApiPropertyOptional({ example: 'user@ipa.ir' })
  email?: string;

  @ApiPropertyOptional({
    type: () => ProvinceResponseDto,
    description: "Member's home province",
  })
  province?: ProvinceResponseDto | string;
}

export class EventRegistrationResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a33' })
  _id: string;

  @ApiProperty({
    type: () => EventResponseDto,
    description: 'Registered event details',
  })
  event: EventResponseDto | string;

  @ApiPropertyOptional({
    type: () => EventRegistrationUserResponseDto,
    description: 'Registered member details (admin view)',
  })
  user?: EventRegistrationUserResponseDto | string;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'Payment settlement status',
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Attendance verification status',
  })
  attended: boolean;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Private attendance/completion certificate file',
  })
  certificate?: MediaFileDto;

  @ApiProperty({ example: '2026-09-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-20T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedEventRegistrationsResponseDto {
  @ApiProperty({ type: [EventRegistrationResponseDto] })
  data: EventRegistrationResponseDto[];

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

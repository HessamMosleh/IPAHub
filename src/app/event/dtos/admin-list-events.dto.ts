import { IsEnum, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { EventType } from '../event.schema';
import { EventTimeFilter } from './list-events.dto';

export class AdminListEventsDto {
  @ApiPropertyOptional({
    enum: EventType,
    description: 'Filter by event type (workshop or conference)',
    example: EventType.WORKSHOP,
  })
  @IsOptional()
  @IsEnum(EventType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: EventType;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description: 'Filter by active/publication status',
    example: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;

  @ApiPropertyOptional({
    enum: EventTimeFilter,
    description: 'Filter by time (upcoming vs past)',
    example: EventTimeFilter.UPCOMING,
  })
  @IsOptional()
  @IsEnum(EventTimeFilter, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  time?: EventTimeFilter;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by province MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Search in event title, description or location',
    example: 'Accounting',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    default: 1,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  page?: number = 1;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    description: 'Page size limit',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  limit?: number = 20;
}

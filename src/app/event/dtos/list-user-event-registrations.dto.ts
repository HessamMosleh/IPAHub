import { IsEnum, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { EventType } from '../event.schema';

export class ListUserEventRegistrationsDto {
  @ApiPropertyOptional({
    enum: EventType,
    description: 'Filter registered events by type (workshop or conference)',
    example: EventType.WORKSHOP,
  })
  @IsOptional()
  @IsEnum(EventType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: EventType;

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

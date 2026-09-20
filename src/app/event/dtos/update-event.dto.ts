import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { foldDigits } from '../../../common/utils/digit.util';
import { EventType } from '../event.schema';

export class UpdateEventDto {
  @ApiPropertyOptional({
    enum: EventType,
    description: 'Event category: workshop or conference',
    example: EventType.WORKSHOP,
  })
  @IsOptional()
  @IsEnum(EventType, { message: i18nValidationMessage('validation.IS_ENUM') })
  type?: EventType;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Event title in English and Persian',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Event description / syllabus / agenda in English and Persian',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Event start date and time',
    example: '2026-10-15T09:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  startsAt?: Date;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Event physical or virtual location / venue name',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: Number,
    description:
      'Participant capacity limit. Absent/null means unlimited seats.',
    example: 50,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const folded = typeof value === 'string' ? foldDigits(value) : value;
    const num = Number(folded);
    return Number.isNaN(num) ? value : num;
  })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  capacity?: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Registration fee in Rials. 0 indicates a free event.',
    example: 1000000,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const folded = typeof value === 'string' ? foldDigits(value) : value;
    const num = Number(folded);
    return Number.isNaN(num) ? value : num;
  })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  fee?: number;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Event promotional poster image',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  poster?: MediaFileDto;

  @ApiPropertyOptional({
    type: String,
    description:
      'Province MongoDB ObjectId. Required for provincial branch events; null/absent for national events.',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description:
      'Active status (ACTIVE = published and open, DISABLED = draft/hidden)',
    example: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Convenience flag: true sets status to ACTIVE, false sets status to DISABLED',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  published?: boolean;
}

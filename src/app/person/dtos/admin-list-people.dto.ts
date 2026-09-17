import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PersonRole } from '../person.schema';

export class AdminListPeopleDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 20, default: 20 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: PersonRole,
    description: 'Filter by organisational role',
  })
  @IsOptional()
  @IsEnum(PersonRole, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  role?: PersonRole;

  @ApiPropertyOptional({
    description: 'Filter by sub-role or position slug',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  subRole?: string;

  @ApiPropertyOptional({
    description: 'Filter by province MongoDB ObjectId (for Province Officials)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  province?: string;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description: 'Filter by publication status',
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;

  @ApiPropertyOptional({
    description: 'Search by name, about, position title in English or Persian',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

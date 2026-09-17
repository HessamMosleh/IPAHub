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

export class AdminListProvincesDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 50, default: 50 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 50;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description: 'Filter by active status (active or disabled)',
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;

  @ApiPropertyOptional({
    description: 'Search by slug or localized name',
    example: 'fars',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

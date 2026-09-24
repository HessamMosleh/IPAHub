import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

export class AdminListRequestTypesDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
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
    example: 'card',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by whether it produces a document or an action',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): boolean | undefined => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  producesDocument?: boolean;
}

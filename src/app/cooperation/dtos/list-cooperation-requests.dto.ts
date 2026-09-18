import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CooperationRequestStatus } from '../cooperation-request.schema';

export class ListCooperationRequestsDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: CooperationRequestStatus,
    description: 'Filter requests by status',
  })
  @IsOptional()
  @IsEnum(CooperationRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: CooperationRequestStatus;
}

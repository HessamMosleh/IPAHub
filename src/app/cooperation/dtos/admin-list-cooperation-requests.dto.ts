import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CooperationRequestStatus } from '../cooperation-request.schema';

export class AdminListCooperationRequestsDto {
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
    enum: CooperationRequestStatus,
    description: 'Filter requests by status (pending, accepted, rejected)',
  })
  @IsOptional()
  @IsEnum(CooperationRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: CooperationRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter requests by province ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    description:
      'Search in member fullName, mobile, nationalCode, city, or description',
    example: 'Tehran',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

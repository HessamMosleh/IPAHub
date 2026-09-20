import { IsBoolean, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export class AdminListEventRegistrationsDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by attendance status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  attended?: boolean;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Filter by payment status (NONE, PENDING, PAID)',
    example: PaymentStatus.PAID,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    type: String,
    description: 'Search member name, mobile, or national code',
    example: '0912',
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
    default: 50,
    description: 'Page size limit',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  limit?: number = 50;
}

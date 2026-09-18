import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Sets a tier's national fees. Province overrides are managed separately via the
 * province-prices endpoint.
 */
export class UpdateMembershipFeeDto {
  @ApiProperty({
    description: 'National annual fee in Rials',
    example: 5000000,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  baseFee: number;

  @ApiPropertyOptional({
    description:
      'National one-time entrance (joining) fee in Rials. Meaningful only for REGULAR; defaults to 0.',
    example: 2000000,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  entranceFee?: number = 0;
}

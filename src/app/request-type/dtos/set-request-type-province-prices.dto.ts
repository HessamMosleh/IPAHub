import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { foldDigits } from '../../../common/utils/digit.util';

/**
 * One province's fee override for a request type.
 *
 * Semantics on write:
 * - `fee` omitted / null → REMOVE this province's override (fall back to baseFee).
 * - `fee` present        → set or update the province's fee override.
 */
export class ProvinceRequestPriceEntryDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the province',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province: string;

  @ApiPropertyOptional({
    description:
      'Fee override in Rials. Omit or null to remove the override and fall back to base fee.',
    example: 700000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const folded = typeof value === 'string' ? foldDigits(value) : value;
    const num = Number(folded);
    return Number.isNaN(num) ? null : num;
  })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  fee?: number | null;
}

export class SetRequestTypeProvincePricesDto {
  @ApiProperty({
    type: [ProvinceRequestPriceEntryDto],
    description: 'Per-province fee overrides for this request type',
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ValidateNested({ each: true })
  @Type(() => ProvinceRequestPriceEntryDto)
  prices: ProvinceRequestPriceEntryDto[];
}

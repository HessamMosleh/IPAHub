import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * One province's fee override for a tier.
 *
 * Semantics on write:
 * - `fee` omitted / null  → REMOVE this province's override (fall back to base).
 * - `fee` present         → set the province's annual fee.
 * - `entranceFee` omitted / null → use the national entrance fee (no override).
 * - `entranceFee` present → override the entrance fee for this province.
 */
export class ProvincePriceEntryDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province: string;

  @ApiPropertyOptional({
    description:
      'Annual fee override in Rials. Omit or null to remove the override.',
    example: 4000000,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  fee?: number | null;

  @ApiPropertyOptional({
    description:
      'Entrance fee override in Rials. Omit or null to keep the national entrance fee.',
    example: 1500000,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  entranceFee?: number | null;
}

export class SetProvincePricesDto {
  @ApiProperty({
    type: [ProvincePriceEntryDto],
    description: 'Per-province fee overrides for the tier',
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ValidateNested({ each: true })
  @Type(() => ProvincePriceEntryDto)
  prices: ProvincePriceEntryDto[];
}

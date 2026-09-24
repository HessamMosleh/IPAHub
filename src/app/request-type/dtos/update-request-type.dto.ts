import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { foldDigits } from '../../../common/utils/digit.util';

export class UpdateRequestTypeDto {
  @ApiPropertyOptional({
    description: 'Unique URL-friendly slug',
    example: 'good-standing-letter',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: i18nValidationMessage('validation.MATCHES'),
  })
  slug?: string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual request type name',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual request type description',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: Number,
    description: 'National base price in Rials.',
    example: 500000,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): number | undefined => {
    if (value === '' || value === null || value === undefined) return undefined;
    const folded = typeof value === 'string' ? foldDigits(value) : value;
    const num = Number(folded);
    return Number.isNaN(num) ? undefined : num;
  })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  baseFee?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Whether fulfilling this request hands the member a file or is an action only.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  producesDocument?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in listings and pickers',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  order?: number;

  @ApiPropertyOptional({
    enum: ActiveStatus,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;
}

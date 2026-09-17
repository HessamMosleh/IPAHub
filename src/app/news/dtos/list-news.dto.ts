import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListNewsDto {
  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 20 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({ type: String, example: '2026-01-01' })
  @IsOptional()
  @IsDateString(
    {},
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  fromDate?: string;

  @ApiPropertyOptional({ type: String, example: '2026-08-14' })
  @IsOptional()
  @IsDateString(
    {},
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  toDate?: string;
}

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ArticleCategory } from '../article.schema';

export class ListArticleDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ArticleCategory,
    description: 'Filter by national or provincial scope',
    example: ArticleCategory.NATIONAL,
  })
  @IsOptional()
  @IsEnum(ArticleCategory, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  category?: ArticleCategory;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter by province MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Search term matched against title, subtitle, and summary',
    example: 'conference',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Inclusive start date (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  fromDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Inclusive end date (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: i18nValidationMessage('validation.IS_DATE_STRING') },
  )
  toDate?: string;
}

import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { NewsCategory, NewsStatus } from '../news.schema';

export class UpdateNewsDto {
  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Post title in English and Persian',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Secondary headline or subtitle',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subTitle?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Article body rich text. Sanitized on write.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  content?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Teaser / summary shown in listings and on the home page',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  summery?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Cover image uploaded to MinIO',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  image?: MediaFileDto;

  @ApiPropertyOptional({
    enum: NewsCategory,
    description: 'National or provincial news category',
    example: NewsCategory.NATIONAL,
  })
  @IsOptional()
  @IsEnum(NewsCategory, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  category?: NewsCategory;

  @ApiPropertyOptional({
    type: String,
    description:
      'Province MongoDB ObjectId (set to null or omit when changing category to NATIONAL)',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    enum: NewsStatus,
    description:
      'Publication status (REGISTERING for draft, ACTIVE for published, DELETED for soft-delete)',
    example: NewsStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(NewsStatus, { message: i18nValidationMessage('validation.IS_ENUM') })
  status?: NewsStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Convenience flag: true sets status to ACTIVE, false sets status to REGISTERING',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  published?: boolean;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Free-text byline',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  byline?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Publication date as displayed to readers',
    example: '2026-09-18T10:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  publishedAt?: Date;
}

import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmptyObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { NewsCategory, NewsStatus } from '../news.schema';

export class CreateNewsDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Post title in English (required fallback) and Persian',
  })
  @ValidateNested()
  @IsNotEmptyObject(
    { nullable: false },
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Secondary headline or subtitle',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  subTitle?: LocalizedTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description:
      'Article body rich text. Sanitized on write to neutralize script/iframe/unsafe content.',
  })
  @ValidateNested()
  @IsNotEmptyObject(
    { nullable: false },
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @Type(() => LocalizedTextDto)
  content: LocalizedTextDto;

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
    default: NewsCategory.NATIONAL,
    description: 'National or provincial news category',
    example: NewsCategory.NATIONAL,
  })
  @IsOptional()
  @IsEnum(NewsCategory, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  category?: NewsCategory = NewsCategory.NATIONAL;

  @ApiPropertyOptional({
    type: String,
    description:
      'Province MongoDB ObjectId. Required when category is PROVINCIAL; must be unset when NATIONAL.',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    enum: NewsStatus,
    default: NewsStatus.REGISTERING,
    description:
      'Publication status (REGISTERING for draft, ACTIVE for published)',
    example: NewsStatus.REGISTERING,
  })
  @IsOptional()
  @IsEnum(NewsStatus, { message: i18nValidationMessage('validation.IS_ENUM') })
  status?: NewsStatus;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Convenience flag: true sets status to ACTIVE, false sets status to REGISTERING',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  published?: boolean;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description:
      'Free-text byline (e.g. guest author / correspondent not in user database)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  byline?: LocalizedTextDto;

  @ApiPropertyOptional({
    description:
      'Publication date as displayed to readers. Defaults to now if published and omitted.',
    example: '2026-09-18T10:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  publishedAt?: Date;
}

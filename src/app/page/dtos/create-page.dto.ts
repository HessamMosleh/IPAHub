import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { PageKey } from '../page.schema';

export class CreatePageDto {
  @ApiProperty({
    enum: PageKey,
    description: 'Unique static page key',
    example: PageKey.ABOUT_FORUM,
  })
  @IsEnum(PageKey, { message: i18nValidationMessage('validation.IS_ENUM') })
  key: PageKey;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Page title in English (required fallback) and Persian',
  })
  @ValidateNested()
  @IsNotEmptyObject(
    { nullable: false },
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Page body rich text. Sanitized on write.',
  })
  @ValidateNested()
  @IsNotEmptyObject(
    { nullable: false },
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @Type(() => LocalizedTextDto)
  body: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Header image uploaded to MinIO',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  image?: MediaFileDto;
}

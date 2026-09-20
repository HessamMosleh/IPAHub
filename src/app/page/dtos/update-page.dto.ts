import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';

export class UpdatePageDto {
  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Page title in English and Persian',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Page body rich text. Sanitized on write.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  body?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Header image uploaded to MinIO',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  image?: MediaFileDto;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Flag to remove header image',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  removeImage?: boolean;
}

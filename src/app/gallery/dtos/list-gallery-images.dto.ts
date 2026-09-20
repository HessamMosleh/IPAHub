import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListGalleryImagesDto {
  @ApiPropertyOptional({
    description:
      'Filter active gallery images by search keyword in caption (EN or FA)',
    example: 'conference',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

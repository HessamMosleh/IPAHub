import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

export class UpdateGalleryImageDto {
  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Updated image file for the gallery slide',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  image?: MediaFileDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Updated optional bilingual caption for the gallery slide',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  caption?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Display order in the carousel',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description: 'Active status of the gallery slide',
    example: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;
}

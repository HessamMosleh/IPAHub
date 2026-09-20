import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmptyObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

export class CreateGalleryImageDto {
  @ApiProperty({
    type: MediaFileDto,
    description: 'Image file uploaded to MinIO/storage for the gallery slide',
  })
  @ValidateNested()
  @IsNotEmptyObject(
    { nullable: false },
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @Type(() => MediaFileDto)
  image: MediaFileDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Optional bilingual caption for the gallery slide',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  caption?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Display order in the carousel (auto-assigned if omitted)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    description: 'Active status of the gallery slide (defaults to active)',
    example: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus;
}

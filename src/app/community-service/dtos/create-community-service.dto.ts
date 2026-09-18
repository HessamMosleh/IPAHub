import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmptyObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class CreateCommunityServiceDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual community service title',
  })
  @IsNotEmptyObject(
    {},
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual community service description',
  })
  @IsNotEmptyObject(
    {},
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Display order in listings (auto-assigned if omitted)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;
}

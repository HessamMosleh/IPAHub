import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class UpdateBoardTermDto {
  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual name of the board term',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto;

  @ApiPropertyOptional({
    description:
      'Term sequence number (highest order represents the current term)',
    example: 3,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  order?: number;

  @ApiPropertyOptional({
    description: 'Start date of the board term',
    example: '2023-06-21T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  startsAt?: Date;

  @ApiPropertyOptional({
    description:
      'End date of the board term (null/omitted if current and ongoing)',
    example: '2026-06-21T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  endsAt?: Date;
}

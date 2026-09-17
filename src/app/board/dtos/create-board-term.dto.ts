import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class CreateBoardTermDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description:
      'Bilingual name of the board term (e.g. Third Term / دوره سوم)',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    description:
      'Term sequence number (highest order represents the current term)',
    example: 3,
  })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1, { message: i18nValidationMessage('validation.MIN') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  order: number;

  @ApiProperty({
    description: 'Start date of the board term',
    example: '2023-06-21T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  startsAt: Date;

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateDocumentRequestDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the requested document type',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  requestType: string;

  @ApiPropertyOptional({
    description:
      'Optional note or remark from the member explaining their request',
    example: 'Needed for embassy visa appointment on Monday.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  note?: string;
}

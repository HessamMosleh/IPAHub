import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CooperationField } from '../cooperation-request.schema';
import { foldDigits } from '../../../common/utils/digit.util';

export class CreateCooperationRequestDto {
  @ApiProperty({
    description: 'Areas of cooperation interest (at least one, unique)',
    enum: CooperationField,
    isArray: true,
    example: [CooperationField.EDUCATIONAL, CooperationField.RESEARCH],
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayNotEmpty({
    message: i18nValidationMessage('validation.ARRAY_NOT_EMPTY'),
  })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE') })
  @IsEnum(CooperationField, {
    each: true,
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  fields: CooperationField[];

  @ApiPropertyOptional({
    description:
      'Optional proposal detail; can be left blank for conversation in follow-up',
    example: 'We would like to propose a joint training course program.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  description?: string;

  @ApiProperty({
    description: 'MongoDB ObjectId of the selected province',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  province: string;

  @ApiProperty({
    description: 'City of residence/operation',
    example: 'Tehran',
    maxLength: 100,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  city: string;

  @ApiProperty({
    description: 'Full postal address',
    example: 'No. 12, Example St., Area 5',
    maxLength: 500,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  postalAddress: string;

  @ApiProperty({
    description:
      '10-digit postal code (Persian and Arabic digits are automatically folded to ASCII)',
    example: '1234567890',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? foldDigits(value).trim() : value,
  )
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Matches(/^\d{10}$/, {
    message: i18nValidationMessage('validation.MATCHES', {
      constraints: ['10-digit postal code'],
    }),
  })
  postalCode: string;

  @ApiProperty({
    description:
      'Contact telephone number (Persian and Arabic digits are automatically folded to ASCII)',
    example: '02112345678',
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? foldDigits(value).trim() : value,
  )
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(20, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  telephone: string;
}

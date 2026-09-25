import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsMobilePhone,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsNationalCode } from '../../../common/validators/is-national-code.validator';

export class CreateProvinceAdminDto {
  @ApiProperty({ example: '09121234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @IsMobilePhone(
    'fa-IR',
    {},
    { message: i18nValidationMessage('validation.IS_MOBILE_PHONE') },
  )
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  mobile: string;

  @ApiProperty({ example: 'علی رضایی' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName: string;

  @ApiProperty({ example: 'Ali Rezaei' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  latinFullName: string;

  @ApiProperty({ example: '0012345678' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Length(10, 10, { message: i18nValidationMessage('validation.LENGTH') })
  @IsNationalCode({
    message: i18nValidationMessage('validation.IS_NATIONAL_CODE'),
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nationalCode: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(72, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password: string;

  @ApiProperty({
    type: [String],
    description: 'Provinces this administrator may manage',
    example: ['66fa3b5a9c1e7a001f3e9a11'],
  })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayMinSize(1, {
    message: i18nValidationMessage('validation.ARRAY_MIN_SIZE'),
  })
  @IsMongoId({
    each: true,
    message: i18nValidationMessage('validation.IS_MONGO_ID'),
  })
  managedProvinces: string[];

  @ApiPropertyOptional({ example: 'admin@ipa.local' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  active?: boolean;
}

import {
  IsEnum,
  IsMobilePhone,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OtpPurpose } from '../otp-challenge.schema';
import { foldDigits } from '../../../common/utils/digit.util';
import { IsNationalCode } from '../../../common/validators/is-national-code.validator';

function foldMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return foldDigits(value).trim();
}

function foldCode(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return foldDigits(value).trim();
}

export class RequestOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @IsMobilePhone(
    'fa-IR',
    {},
    { message: i18nValidationMessage('validation.IS_MOBILE_PHONE') },
  )
  @Transform(({ value }) => foldMobile(value))
  mobile: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose, { message: i18nValidationMessage('validation.IS_ENUM') })
  purpose: OtpPurpose;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @IsMobilePhone(
    'fa-IR',
    {},
    { message: i18nValidationMessage('validation.IS_MOBILE_PHONE') },
  )
  @Transform(({ value }) => foldMobile(value))
  mobile: string;

  @ApiProperty({ example: '12345' })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Length(5, 5, { message: i18nValidationMessage('validation.LENGTH') })
  @Transform(({ value }) => foldCode(value))
  code: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose, { message: i18nValidationMessage('validation.IS_ENUM') })
  purpose: OtpPurpose;

  @ApiPropertyOptional({
    description: 'Required when purpose is register',
    example: '0012345678',
  })
  @ValidateIf((o: VerifyOtpDto) => o.purpose === OtpPurpose.REGISTER)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Length(10, 10, { message: i18nValidationMessage('validation.LENGTH') })
  @IsNationalCode({
    message: i18nValidationMessage('validation.IS_NATIONAL_CODE'),
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? foldDigits(value).trim() : value,
  )
  nationalCode?: string;

  @ApiPropertyOptional({
    description: 'Required when purpose is register',
    example: 'علی رضایی',
  })
  @ValidateIf((o: VerifyOtpDto) => o.purpose === OtpPurpose.REGISTER)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Required when purpose is register',
    example: 'Ali Rezaei',
  })
  @ValidateIf((o: VerifyOtpDto) => o.purpose === OtpPurpose.REGISTER)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  latinFullName?: string;

  @ApiPropertyOptional({
    description: 'Province ObjectId — required when purpose is register',
  })
  @ValidateIf((o: VerifyOtpDto) => o.purpose === OtpPurpose.REGISTER)
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  province?: string;
}

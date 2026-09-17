import {
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @IsMobilePhone(
    'fa-IR',
    {},
    {
      message: i18nValidationMessage('validation.IS_MOBILE_PHONE'),
    },
  )
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  mobile: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  password: string;
}

export class OtpLoginDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @IsMobilePhone(
    'fa-IR',
    {},
    {
      message: i18nValidationMessage('validation.IS_MOBILE_PHONE'),
    },
  )
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  mobile: string;
}

import {
  IsDate,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { UserSex } from '../user.schema';
import { IsNationalCode } from '../../../common/validators/is-national-code.validator';

export class CreateUserDto {
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  email?: string;

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
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  latinFullName: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Length(10, 10, { message: i18nValidationMessage('validation.LENGTH') })
  @IsNationalCode({
    message: i18nValidationMessage('validation.IS_NATIONAL_CODE'),
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nationalCode: string;

  @IsEnum(UserSex, { message: i18nValidationMessage('validation.IS_ENUM') })
  sex: UserSex;

  @Type(() => Date)
  @IsDate({ message: i18nValidationMessage('validation.IS_DATE') })
  birthday: Date;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(72, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password: string;

  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  province: string;
}

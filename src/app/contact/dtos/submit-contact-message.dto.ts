import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SubmitContactMessageDto {
  @ApiProperty({
    description: 'Name of the sender',
    example: 'Ali Rezaei',
    maxLength: 200,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(200, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  name: string;

  @ApiProperty({
    description: 'Email of the sender',
    example: 'ali.rezaei@example.com',
  })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  email: string;

  @ApiProperty({
    description: 'Message body',
    example: 'Hello, I have an inquiry about membership application.',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MinLength(1, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(5000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  message: string;
}

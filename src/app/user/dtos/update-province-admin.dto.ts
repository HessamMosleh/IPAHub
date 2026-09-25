import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProvinceAdminDto {
  @ApiPropertyOptional({ example: 'علی رضایی' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(100, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  latinFullName?: string;

  @ApiPropertyOptional({
    description: 'Omit or leave empty to keep the current password',
    minLength: 8,
    maxLength: 72,
  })
  @IsOptional()
  @ValidateIf((_, v) => typeof v === 'string' && v.length > 0)
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH') })
  @MaxLength(72, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  password?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Replace the set of managed provinces',
  })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayMinSize(1, {
    message: i18nValidationMessage('validation.ARRAY_MIN_SIZE'),
  })
  @IsMongoId({
    each: true,
    message: i18nValidationMessage('validation.IS_MONGO_ID'),
  })
  managedProvinces?: string[];

  @ApiPropertyOptional({ example: 'admin@ipa.local' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiPropertyOptional({
    description: 'When false, the administrator cannot sign in',
  })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  active?: boolean;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SaveSiteSettingsDto {
  @ApiPropertyOptional({
    description: 'Full official name of the association',
    example: 'Iranian Petroleum Consultants Association',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  associationName?: string;

  @ApiPropertyOptional({
    description: 'MinIO storage key or URL for the association logo',
    example: 'logos/ipa-logo.png',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  logoKey?: string;

  @ApiPropertyOptional({
    description: 'Facebook page URL',
    example: 'https://facebook.com/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL or handle (e.g. instagram.com/ipa)',
    example: 'https://instagram.com/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Telegram channel URL (e.g. t.me/ipa)',
    example: 'https://t.me/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  telegram?: string;

  @ApiPropertyOptional({
    description:
      'WhatsApp link or phone number (e.g. 09121234567, +98 912 123 4567, or https://wa.me/...)',
    example: 'https://wa.me/989121234567',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  whatsapp?: string;
}

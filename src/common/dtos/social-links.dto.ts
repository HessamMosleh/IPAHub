import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SocialLinksDto {
  @ApiPropertyOptional({
    description: 'Facebook page URL',
    example: 'https://facebook.com/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL',
    example: 'https://instagram.com/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Telegram channel or group URL',
    example: 'https://t.me/ipa',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  telegram?: string;

  @ApiPropertyOptional({
    description:
      'WhatsApp link or contact number (e.g. 09121234567 or https://wa.me/...)',
    example: 'https://wa.me/989121234567',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  whatsapp?: string;
}

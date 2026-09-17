import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProvinceSocialsDto {
  @ApiPropertyOptional({
    description: 'Facebook page URL or handle',
    example: 'https://facebook.com/ipa_tehran',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL or handle',
    example: 'https://instagram.com/ipa_tehran',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Telegram channel URL',
    example: 'https://t.me/ipa_tehran',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  telegram?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp number or wa.me link',
    example: '09120000000',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  whatsapp?: string;
}

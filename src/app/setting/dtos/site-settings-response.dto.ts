import { ApiPropertyOptional } from '@nestjs/swagger';
import { SocialLinksDto } from '../../../common/dtos/social-links.dto';

export class SiteSettingsResponseDto {
  @ApiPropertyOptional({
    description: 'Official association name',
    example: 'Iranian Petroleum Consultants Association',
  })
  associationName?: string;

  @ApiPropertyOptional({
    description: 'Storage key for the association logo',
    example: 'logos/ipa-logo.png',
  })
  logoKey?: string;

  @ApiPropertyOptional({
    description: 'Facebook page URL',
    example: 'https://facebook.com/ipa',
  })
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Instagram profile URL',
    example: 'https://instagram.com/ipa',
  })
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Telegram channel URL',
    example: 'https://t.me/ipa',
  })
  telegram?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp direct link',
    example: 'https://wa.me/989121234567',
  })
  whatsapp?: string;

  @ApiPropertyOptional({
    type: SocialLinksDto,
    description: 'Structured social media links',
  })
  socials?: SocialLinksDto;

  @ApiPropertyOptional({
    description: 'Raw key-value pairs of all site settings',
    example: {
      associationName: 'Iranian Petroleum Consultants Association',
      facebook: 'https://facebook.com/ipa',
    },
  })
  all?: Record<string, string>;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { SocialLinksDto } from '../../../common/dtos/social-links.dto';

export class UpdateContactInfoDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual address of the association',
  })
  @IsNotEmptyObject(
    {},
    { message: i18nValidationMessage('validation.IS_NOT_EMPTY') },
  )
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address: LocalizedTextDto;

  @ApiProperty({
    description: 'Telephone number of the association',
    example: '+98 21 8888 0000',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  phone: string;

  @ApiProperty({
    description: 'General contact email address',
    example: 'info@ipa.example',
  })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  email: string;

  @ApiPropertyOptional({
    type: SocialLinksDto,
    description: 'Association social media links',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socials?: SocialLinksDto;
}

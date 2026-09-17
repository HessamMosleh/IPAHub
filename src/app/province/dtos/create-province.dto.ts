import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { SocialLinksDto } from '../../../common/dtos/social-links.dto';

export class CreateProvinceDto {
  @ApiProperty({
    description: 'Unique URL-friendly slug',
    example: 'tehran-city',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: i18nValidationMessage('validation.MATCHES'),
  })
  slug: string;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual province name',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Display order in listings and pickers',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    type: SocialLinksDto,
    description: 'Social media links for this province',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socials?: SocialLinksDto;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    default: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus = ActiveStatus.ACTIVE;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class UpdateProvinceContactDto {
  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual contact address of the province office',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Contact phone number of the province office',
    example: '03133445566',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address of the province office',
    example: 'isfahan@ipa.ir',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  email?: string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Alias for address',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  contactAddress?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Alias for phone',
    example: '03133445566',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Alias for email',
    example: 'isfahan@ipa.ir',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  contactEmail?: string;
}

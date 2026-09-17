import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListProvincesDto {
  @ApiPropertyOptional({
    description: 'Filter active provinces by search keyword (slug, en, fa)',
    example: 'tehran',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

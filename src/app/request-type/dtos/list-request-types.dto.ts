import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListRequestTypesDto {
  @ApiPropertyOptional({
    description: 'Filter active request types by search keyword (slug, en, fa)',
    example: 'letter',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    description:
      'Optional member province ID to calculate the applicable fee override',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  province?: string;
}

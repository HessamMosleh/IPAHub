import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LocalizedTextDto {
  @ApiProperty({
    description: 'English text (required fallback)',
    example: 'Tehran (City)',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  en: string;

  @ApiPropertyOptional({
    description: 'Persian text',
    example: 'تهران (شهر)',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  fa?: string;
}

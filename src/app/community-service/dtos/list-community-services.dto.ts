import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListCommunityServicesDto {
  @ApiPropertyOptional({
    description: 'Search keyword across title and description (EN and FA)',
    example: 'training',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

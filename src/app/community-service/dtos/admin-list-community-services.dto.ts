import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AdminListCommunityServicesDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 50, default: 50 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Search keyword across title and description (EN and FA)',
    example: 'training',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

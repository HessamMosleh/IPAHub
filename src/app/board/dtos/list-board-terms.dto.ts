import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ListBoardTermsDto {
  @ApiPropertyOptional({
    description: 'Filter terms or members by search term in name/title',
    example: 'دوره سوم',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    description: 'Specific term order number to view (e.g. 1, 2, 3)',
    example: '3',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  term?: string;
}

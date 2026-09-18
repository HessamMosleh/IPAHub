import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class UpdateCommunityServiceDto {
  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual community service title',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Bilingual community service description',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Display order in listings',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;
}

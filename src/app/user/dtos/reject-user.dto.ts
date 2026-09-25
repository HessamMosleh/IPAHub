import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RejectUserDto {
  @ApiPropertyOptional({
    description: 'Optional reason shown to the member',
    example: 'Uploaded documents are incomplete.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(1000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  reason?: string;
}

import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class MarkPaidEventRegistrationDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Bank tracking number, gateway reference, or receipt number',
    example: 'TRX-12345678',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  reference?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Internal administrative note regarding payment confirmation',
    example: 'Confirmed via Bank Melli transfer slip #9988',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  note?: string;
}

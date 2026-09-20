import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Confirms an offline (bank receipt, cash, card-to-card) payment for an accepted document request bill.
 * The amount is not accepted from the client — it is the frozen `fee` snapshotted on the request.
 */
export class MarkPaidDocumentRequestDto {
  @ApiPropertyOptional({
    description: 'Bank tracking number, gateway reference, or receipt number',
    example: 'DOC-TRK-99201',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(200, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  reference?: string;

  @ApiPropertyOptional({
    description: 'Optional internal note about the confirmation',
    example: 'Confirmed against bank statement 2026-09-20',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  note?: string;
}

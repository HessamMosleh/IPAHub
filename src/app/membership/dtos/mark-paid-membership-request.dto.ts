import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Confirms an offline (bank transfer / receipt) payment for a membership bill.
 * The amount is not accepted from the client — it is the frozen `amountDue`
 * snapshotted on the request at approval.
 */
export class MarkPaidMembershipRequestDto {
  @ApiPropertyOptional({
    description: 'Bank tracking number, gateway reference, or receipt number',
    example: 'TRK-882931',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(200, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  reference?: string;

  @ApiPropertyOptional({
    description: 'Optional internal note about the confirmation',
    example: 'Confirmed against bank statement 2026-09-18',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  note?: string;
}

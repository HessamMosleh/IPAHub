import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RejectDocumentRequestDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the document request',
    example:
      'Missing official prerequisite documents or unverified information.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  reason?: string;
}

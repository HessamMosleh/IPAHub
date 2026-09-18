import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeclineCooperationRequestDto {
  @ApiProperty({
    description: 'Reason for declining the cooperation proposal',
    example:
      'Please resubmit with a more detailed project timeline and proposal.',
    maxLength: 1000,
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  @MaxLength(1000, { message: i18nValidationMessage('validation.MAX_LENGTH') })
  reason: string;
}

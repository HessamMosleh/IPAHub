import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateSingleSettingDto {
  @ApiProperty({
    description: 'Setting string value',
    example: 'Iranian Petroleum Consultants Association',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  value: string;
}

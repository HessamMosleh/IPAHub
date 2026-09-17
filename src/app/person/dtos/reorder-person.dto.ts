import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ReorderDirection } from '../../province/dtos/reorder-province.dto';

export { ReorderDirection };

export class ReorderPersonDto {
  @ApiProperty({
    enum: ReorderDirection,
    description:
      'Move person up or down in listing order within their role group',
    example: ReorderDirection.UP,
  })
  @IsEnum(ReorderDirection, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  dir: ReorderDirection;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum ReorderDirection {
  UP = 'up',
  DOWN = 'down',
}

export class ReorderRequestTypeDto {
  @ApiProperty({
    enum: ReorderDirection,
    description: 'Move request type up or down in listing order',
    example: ReorderDirection.UP,
  })
  @IsEnum(ReorderDirection, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  dir: ReorderDirection;
}

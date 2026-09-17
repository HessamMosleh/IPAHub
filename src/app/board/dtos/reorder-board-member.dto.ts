import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum ReorderDirection {
  UP = 'up',
  DOWN = 'down',
}

export class ReorderBoardMemberDto {
  @ApiProperty({
    enum: ReorderDirection,
    description: 'Move board member up or down within their position group',
    example: ReorderDirection.UP,
  })
  @IsEnum(ReorderDirection, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  dir: ReorderDirection;
}

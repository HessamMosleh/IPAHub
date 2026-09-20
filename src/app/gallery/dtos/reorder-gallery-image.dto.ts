import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export enum ReorderDirection {
  UP = 'up',
  DOWN = 'down',
}

export class ReorderGalleryImageDto {
  @ApiProperty({
    enum: ReorderDirection,
    description: 'Move gallery slide up or down in carousel order',
    example: ReorderDirection.UP,
  })
  @IsEnum(ReorderDirection, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  dir: ReorderDirection;
}

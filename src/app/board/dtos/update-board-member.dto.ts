import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BoardPosition } from '../board-term.schema';

export class UpdateBoardMemberDto {
  @ApiPropertyOptional({
    enum: BoardPosition,
    description: 'Updated position held within this term',
    example: BoardPosition.VICE_CHAIRMAN,
  })
  @IsOptional()
  @IsEnum(BoardPosition, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  position?: BoardPosition;

  @ApiPropertyOptional({
    description: 'Custom sort order within the membership position group',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  order?: number;
}

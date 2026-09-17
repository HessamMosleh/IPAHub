import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BoardPosition } from '../board-term.schema';

export class AddBoardMemberDto {
  @ApiProperty({
    description:
      'MongoDB ObjectId of the Person record (must have role = BOARD)',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  person: string;

  @ApiProperty({
    enum: BoardPosition,
    description: 'Position held within this term',
    example: BoardPosition.CHAIRMAN,
  })
  @IsEnum(BoardPosition, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  position: BoardPosition;

  @ApiPropertyOptional({
    description: 'Custom sort order within the membership position group',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  order?: number = 0;
}

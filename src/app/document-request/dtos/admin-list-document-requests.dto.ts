import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DocumentRequestStatus } from '../document-request.schema';

export class AdminListDocumentRequestsDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 50;

  @ApiPropertyOptional({
    enum: DocumentRequestStatus,
    description:
      'Filter requests by status (pending, accepted, rejected, completed)',
  })
  @IsOptional()
  @IsEnum(DocumentRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: DocumentRequestStatus;

  @ApiPropertyOptional({
    description: 'Filter requests by RequestType ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  requestType?: string;

  @ApiPropertyOptional({
    description: 'Filter requests by member province ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    description: 'Search in member fullName, mobile, nationalCode, or note',
    example: 'Ali Rezaei',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    description:
      'Synthetic filter for requests needing admin action (pending OR accepted & paid/free)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === 'false' || value === false || value === 0 || value === '0') {
      return false;
    }
    return value as boolean;
  })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  attention?: boolean;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import {
  MembershipRequestKind,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';

export class AdminListMembershipRequestsDto {
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
    enum: MembershipRequestStatus,
    description: 'Filter by request status',
  })
  @IsOptional()
  @IsEnum(MembershipRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: MembershipRequestStatus;

  @ApiPropertyOptional({
    enum: MembershipRequestKind,
    description: 'Filter by request kind (application or renewal)',
  })
  @IsOptional()
  @IsEnum(MembershipRequestKind, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  kind?: MembershipRequestKind;

  @ApiPropertyOptional({
    enum: MembershipType,
    description: 'Filter by requested membership tier',
  })
  @IsOptional()
  @IsEnum(MembershipType, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  type?: MembershipType;

  @ApiPropertyOptional({
    description: 'Filter by the applicant province ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    description: 'Search in applicant fullName, mobile, nationalCode, or email',
    example: 'Ali',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

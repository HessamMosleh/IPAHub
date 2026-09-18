import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  MembershipRequestKind,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';

export class ListMembershipRequestsDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @IsPositive({ message: i18nValidationMessage('validation.IS_POSITIVE') })
  @Max(100, { message: i18nValidationMessage('validation.MAX') })
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: MembershipRequestStatus,
    description: 'Filter requests by status',
  })
  @IsOptional()
  @IsEnum(MembershipRequestStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: MembershipRequestStatus;

  @ApiPropertyOptional({
    enum: MembershipRequestKind,
    description: 'Filter requests by kind (application or renewal)',
  })
  @IsOptional()
  @IsEnum(MembershipRequestKind, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  kind?: MembershipRequestKind;
}

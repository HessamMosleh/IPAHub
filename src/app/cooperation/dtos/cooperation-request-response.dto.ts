import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CooperationField,
  CooperationRequestStatus,
} from '../cooperation-request.schema';

export class CooperationUserSummaryDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  fullName?: string;

  @ApiPropertyOptional({ example: '+989121234567' })
  mobile?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  nationalCode?: string;

  @ApiPropertyOptional({ example: 'ali.rezaei@example.com' })
  email?: string;
}

export class CooperationRequestResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ type: CooperationUserSummaryDto })
  user?: CooperationUserSummaryDto | string;

  @ApiProperty({
    enum: CooperationField,
    isArray: true,
    example: [CooperationField.EDUCATIONAL, CooperationField.RESEARCH],
  })
  fields: CooperationField[];

  @ApiPropertyOptional({
    example: 'We would like to propose a joint training course program.',
  })
  description?: string;

  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  province: any;

  @ApiProperty({ example: 'Tehran' })
  city: string;

  @ApiProperty({ example: 'No. 12, Example St., Area 5' })
  postalAddress: string;

  @ApiProperty({ example: '1234567890' })
  postalCode: string;

  @ApiProperty({ example: '02112345678' })
  telephone: string;

  @ApiProperty({
    enum: CooperationRequestStatus,
    example: CooperationRequestStatus.PENDING,
  })
  status: CooperationRequestStatus;

  @ApiPropertyOptional({
    example: 'Please resubmit with a more detailed proposal.',
  })
  rejectionReason?: string;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  decidedAt?: Date;

  @ApiProperty({ example: '2026-09-18T09:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedCooperationRequestsResponseDto {
  @ApiProperty({ type: [CooperationRequestResponseDto] })
  data: CooperationRequestResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import {
  MembershipRequestKind,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';

export class MembershipApplicantSummaryDto {
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

export class MembershipRequestResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ type: MembershipApplicantSummaryDto })
  user?: MembershipApplicantSummaryDto | string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.REGULAR })
  type: MembershipType;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { centerName: 'Example Center', city: 'Tehran' },
  })
  formData: Record<string, string>;

  @ApiProperty({
    enum: MembershipRequestKind,
    example: MembershipRequestKind.APPLICATION,
  })
  kind: MembershipRequestKind;

  @ApiProperty({
    enum: MembershipRequestStatus,
    example: MembershipRequestStatus.PENDING,
  })
  status: MembershipRequestStatus;

  @ApiPropertyOptional({ example: 'Illegible licence, please re-upload.' })
  rejectionReason?: string;

  @ApiProperty({ example: 5000000 })
  fee: number;

  @ApiProperty({ example: 2000000 })
  entranceFee: number;

  @ApiPropertyOptional({ enum: MembershipType, nullable: true })
  creditType?: MembershipType;

  @ApiProperty({ example: 3000000 })
  creditApplied: number;

  @ApiProperty({ example: 4000000 })
  amountDue: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  paidAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  decidedAt?: Date;

  @ApiProperty({ example: '2026-09-18T09:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedMembershipRequestsResponseDto {
  @ApiProperty({ type: [MembershipRequestResponseDto] })
  data: MembershipRequestResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

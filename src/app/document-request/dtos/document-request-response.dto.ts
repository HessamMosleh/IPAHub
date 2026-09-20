import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentRequestStatus } from '../document-request.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class DocumentRequestUserSummaryDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  latinFullName?: string;

  @ApiPropertyOptional({ example: '+989121234567' })
  mobile?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  nationalCode?: string;

  @ApiPropertyOptional({ example: '66fa3b5a9c1e7a001f3e9a11' })
  province?: any;

  @ApiPropertyOptional({ example: 'regular' })
  membershipType?: string;

  @ApiPropertyOptional({ example: 1000 })
  membershipNo?: number;

  @ApiPropertyOptional({ type: MediaFileDto })
  photo?: MediaFileDto;
}

export class DocumentRequestTypeSummaryDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 'membership-card' })
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  description?: LocalizedTextDto;

  @ApiProperty({ example: true })
  producesDocument: boolean;

  @ApiPropertyOptional({ example: 500000 })
  baseFee?: number;
}

export class DocumentRequestResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ type: DocumentRequestUserSummaryDto })
  user?: DocumentRequestUserSummaryDto | string;

  @ApiProperty({ type: DocumentRequestTypeSummaryDto })
  requestType: DocumentRequestTypeSummaryDto | string;

  @ApiProperty({
    enum: DocumentRequestStatus,
    example: DocumentRequestStatus.PENDING,
  })
  status: DocumentRequestStatus;

  @ApiPropertyOptional({
    example: 'Needed for embassy visa appointment.',
  })
  note?: string;

  @ApiProperty({
    description: 'Frozen fee in Rials at the time of request submission',
    example: 500000,
  })
  fee: number;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.NONE,
  })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Issued private file delivered to the member upon fulfillment',
    type: MediaFileDto,
  })
  issuedFile?: MediaFileDto;

  @ApiPropertyOptional({
    example: 'Incomplete prerequisite paperwork provided.',
  })
  rejectionReason?: string;

  @ApiProperty({ example: '2026-09-20T09:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-20T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedDocumentRequestsResponseDto {
  @ApiProperty({ type: [DocumentRequestResponseDto] })
  data: DocumentRequestResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

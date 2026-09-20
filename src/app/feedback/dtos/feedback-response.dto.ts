import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedbackUserSummaryDto {
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
}

export class FeedbackResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiPropertyOptional({ type: FeedbackUserSummaryDto })
  user?: FeedbackUserSummaryDto | string;

  @ApiPropertyOptional({ example: 'Website suggestion' })
  subject?: string;

  @ApiProperty({ example: 'Great site, please add more workshops.' })
  body: string;

  @ApiProperty({ example: false })
  resolved: boolean;

  @ApiProperty({ example: '2026-09-20T09:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-20T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedFeedbackResponseDto {
  @ApiProperty({ type: [FeedbackResponseDto] })
  data: FeedbackResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class FeedbackPendingCountResponseDto {
  @ApiProperty({
    example: 5,
    description: 'Number of open (unresolved) feedback messages',
  })
  count: number;
}

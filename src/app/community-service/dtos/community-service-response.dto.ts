import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class CommunityServiceResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  description: LocalizedTextDto;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedCommunityServicesResponseDto {
  @ApiProperty({ type: [CommunityServiceResponseDto] })
  data: CommunityServiceResponseDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

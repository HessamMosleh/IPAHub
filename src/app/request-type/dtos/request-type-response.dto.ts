import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { ProvinceResponseDto } from '../../province/dtos/province-response.dto';

export class ProvinceRequestPriceResponseDto {
  @ApiProperty({
    description: 'Province reference (ObjectId string or populated object)',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  province: string | ProvinceResponseDto;

  @ApiProperty({ example: 700000, description: 'Overridden fee in Rials' })
  fee: number;
}

export class RequestTypeResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 'membership-card' })
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  description?: LocalizedTextDto;

  @ApiProperty({
    example: 500000,
    description: 'National base price in Rials. 0 indicates free.',
  })
  baseFee: number;

  @ApiPropertyOptional({
    type: [ProvinceRequestPriceResponseDto],
    description: 'Per-province price overrides',
  })
  prices?: ProvinceRequestPriceResponseDto[];

  @ApiProperty({
    example: true,
    description:
      'Whether fulfilling this request hands the member a file or is an action only.',
  })
  producesDocument: boolean;

  @ApiProperty({ example: 0, description: 'Display order in listings' })
  order: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiPropertyOptional({
    example: 500000,
    description:
      'Applicable fee in Rials for the queried province, if province parameter was supplied.',
  })
  applicableFee?: number;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedRequestTypesResponseDto {
  @ApiProperty({ type: [RequestTypeResponseDto] })
  data: RequestTypeResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

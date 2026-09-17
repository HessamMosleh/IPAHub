import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { SocialLinksDto } from '../../../common/dtos/social-links.dto';

export class ProvinceResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 'tehran-city' })
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiPropertyOptional({ type: SocialLinksDto })
  socials?: SocialLinksDto;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedProvincesResponseDto {
  @ApiProperty({ type: [ProvinceResponseDto] })
  data: ProvinceResponseDto[];

  @ApiProperty({ example: 32 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

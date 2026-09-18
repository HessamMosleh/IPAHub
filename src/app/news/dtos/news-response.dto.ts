import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { ProvinceResponseDto } from '../../province/dtos/province-response.dto';
import { NewsCategory, NewsStatus } from '../news.schema';

export class NewsAuthorResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a99' })
  _id: string;

  @ApiProperty({ example: 'Ali Rezaei' })
  fullName: string;

  @ApiPropertyOptional({ example: 'Ali Rezaei' })
  latinFullName?: string;
}

export class NewsResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  subTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  content: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  summery?: LocalizedTextDto;

  @ApiPropertyOptional({ type: MediaFileDto })
  image?: MediaFileDto;

  @ApiProperty({ enum: NewsCategory, example: NewsCategory.NATIONAL })
  category: NewsCategory;

  @ApiPropertyOptional({
    type: () => ProvinceResponseDto,
    description: 'Populated province details (for PROVINCIAL news)',
  })
  province?: ProvinceResponseDto | string;

  @ApiProperty({ enum: NewsStatus, example: NewsStatus.ACTIVE })
  status: NewsStatus;

  @ApiPropertyOptional({
    description: 'The admin user who entered the post',
  })
  author?: NewsAuthorResponseDto | string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Free-text byline (e.g. guest author / correspondent)',
  })
  byline?: LocalizedTextDto;

  @ApiProperty({ example: '2026-09-18T10:00:00.000Z' })
  publishedAt: Date;

  @ApiProperty({ example: '2026-09-18T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedNewsResponseDto {
  @ApiProperty({ type: [NewsResponseDto] })
  data: NewsResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

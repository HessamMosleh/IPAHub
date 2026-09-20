import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { PageKey } from '../page.schema';

export class PageResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ enum: PageKey, example: PageKey.ABOUT_FORUM })
  key: PageKey;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  body: LocalizedTextDto;

  @ApiPropertyOptional({ type: MediaFileDto })
  image?: MediaFileDto;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-18T10:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedPagesResponseDto {
  @ApiProperty({ type: [PageResponseDto] })
  data: PageResponseDto[];

  @ApiProperty({ example: 6 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

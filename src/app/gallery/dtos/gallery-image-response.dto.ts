import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

export class GalleryImageResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ type: MediaFileDto })
  image: MediaFileDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  caption?: LocalizedTextDto;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedGalleryImagesResponseDto {
  @ApiProperty({ type: [GalleryImageResponseDto] })
  data: GalleryImageResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

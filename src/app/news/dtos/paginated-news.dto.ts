import { ApiProperty } from '@nestjs/swagger';
import { News } from '../news.schema';

export class PaginatedNewsDto {
  @ApiProperty({ type: [News] })
  data: News[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { ListNewsDto } from './dtos/list-news.dto';
import { PaginatedNewsDto } from './dtos/paginated-news.dto';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({
    summary: 'List news with pagination and province/date filters',
  })
  @ApiOkResponse({
    type: PaginatedNewsDto,
    description: 'Paginated list of news items.',
  })
  async listNews(@Query() dto: ListNewsDto): Promise<PaginatedNewsDto> {
    return this.newsService.listNews(dto);
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { NewsService } from '../services/news.service';
import { ListNewsDto } from '../dtos/list-news.dto';
import {
  NewsResponseDto,
  PaginatedNewsResponseDto,
} from '../dtos/news-response.dto';

/**
 * Public/Client News Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users,
 * exposing only active, published news with no administrative mutation capabilities.
 */
@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List published news posts with pagination, category/province/date filters, and keyword search',
  })
  @ApiOkResponse({
    type: PaginatedNewsResponseDto,
    description:
      'Paginated list of active news posts sorted by publication date descending.',
  })
  async findAll(
    @Query() query: ListNewsDto,
  ): Promise<PaginatedNewsResponseDto> {
    const result = await this.newsService.findAll(query);
    return result as unknown as PaginatedNewsResponseDto;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active news post by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'News post MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: NewsResponseDto,
    description: 'The active news post details.',
  })
  @ApiNotFoundResponse({ description: 'News post not found or not active.' })
  async findById(@Param('id') id: string): Promise<NewsResponseDto> {
    const news = await this.newsService.findById(id);
    return news as unknown as NewsResponseDto;
  }
}

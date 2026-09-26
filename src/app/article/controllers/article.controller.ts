import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ArticleService } from '../services/article.service';
import { ListArticleDto } from '../dtos/list-article.dto';
import {
  ArticleResponseDto,
  PaginatedArticlesResponseDto,
} from '../dtos/article-response.dto';

/**
 * Public/Client Article Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users,
 * exposing only active, published article with no administrative mutation capabilities.
 */
@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiOperation({
    summary:
      'List published articles with pagination, category/province/date filters, and keyword search',
  })
  @ApiOkResponse({
    type: PaginatedArticlesResponseDto,
    description:
      'Paginated list of active articles sorted by publication date descending.',
  })
  async findAll(
    @Query() query: ListArticleDto,
  ): Promise<PaginatedArticlesResponseDto> {
    const result = await this.articleService.findAll(query);
    return result as unknown as PaginatedArticlesResponseDto;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active article by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Article MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: ArticleResponseDto,
    description: 'The active article details.',
  })
  @ApiNotFoundResponse({ description: 'Article not found or not active.' })
  async findById(@Param('id') id: string): Promise<ArticleResponseDto> {
    const article = await this.articleService.findById(id);
    return article as unknown as ArticleResponseDto;
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PageService } from '../services/page.service';
import { ListPagesDto } from '../dtos/list-pages.dto';
import { PageResponseDto } from '../dtos/page-response.dto';
import { PageKey } from '../page.schema';

/**
 * Public/Client Page Controller.
 * Adheres to SRP — handles incoming HTTP queries for public visitors,
 * exposing static CMS pages (e.g. about-forum, goals, memorandum) with
 * no administrative mutation capabilities.
 */
@ApiTags('Page')
@Controller('page')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  @ApiOperation({
    summary: 'List all static CMS pages, optionally filtered by keyword search',
  })
  @ApiOkResponse({
    type: [PageResponseDto],
    description: 'List of static pages.',
  })
  async findAll(@Query() query: ListPagesDto): Promise<PageResponseDto[]> {
    const pages = await this.pageService.findAll(query);
    return pages as unknown as PageResponseDto[];
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get static page by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Page MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'The static page details.',
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  async findById(@Param('id') id: string): Promise<PageResponseDto> {
    const page = await this.pageService.findById(id);
    return page as unknown as PageResponseDto;
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get static page by key (e.g. about-forum, goals, memorandum)',
  })
  @ApiParam({
    name: 'key',
    enum: PageKey,
    description: 'Unique page key identifier',
    example: PageKey.ABOUT_FORUM,
  })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'The static page details.',
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  async findByKey(@Param('key') key: string): Promise<PageResponseDto> {
    const page = await this.pageService.findByKey(key);
    return page as unknown as PageResponseDto;
  }
}

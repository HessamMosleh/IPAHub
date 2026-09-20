import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/user.schema';
import { PageAdminService } from '../services/page-admin.service';
import { AdminListPagesDto } from '../dtos/admin-list-pages.dto';
import { CreatePageDto } from '../dtos/create-page.dto';
import { UpdatePageDto } from '../dtos/update-page.dto';
import { SavePageDto } from '../dtos/save-page.dto';
import {
  PageResponseDto,
  PaginatedPagesResponseDto,
} from '../dtos/page-response.dto';
import { PageKey } from '../page.schema';

/**
 * Administrative Page Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Page')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/page')
export class PageAdminController {
  constructor(private readonly pageAdminService: PageAdminService) {}

  @Get()
  @ApiOperation({
    summary: 'List static pages with pagination and search filter',
  })
  @ApiOkResponse({
    type: PaginatedPagesResponseDto,
    description: 'Paginated list of static pages.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListPagesDto,
  ): Promise<PaginatedPagesResponseDto> {
    const result = await this.pageAdminService.findAll(query);
    return result as unknown as PaginatedPagesResponseDto;
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Idempotently seed the 6 canonical default static pages',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'number', example: 6 },
        total: { type: 'number', example: 6 },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async seed(): Promise<{ seeded: number; total: number }> {
    return this.pageAdminService.seed();
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get static page by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'Static page details.',
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findById(@Param('id') id: string): Promise<PageResponseDto> {
    const page = await this.pageAdminService.findById(id);
    return page as unknown as PageResponseDto;
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get static page by key (e.g. about-forum)' })
  @ApiParam({ name: 'key', enum: PageKey, example: PageKey.ABOUT_FORUM })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'Static page details.',
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findByKey(@Param('key') key: string): Promise<PageResponseDto> {
    const page = await this.pageAdminService.findByKey(key);
    return page as unknown as PageResponseDto;
  }

  @Put(':key')
  @ApiOperation({
    summary:
      'Upsert/save static page content by key (creates if absent, updates if present)',
  })
  @ApiParam({ name: 'key', enum: PageKey, example: PageKey.ABOUT_FORUM })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'The saved static page.',
  })
  @ApiBadRequestResponse({ description: 'Invalid page key.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async save(
    @Param('key') key: string,
    @Body() dto: SavePageDto,
  ): Promise<PageResponseDto> {
    const page = await this.pageAdminService.save(key, dto);
    return page as unknown as PageResponseDto;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new static page' })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'The created static page.',
  })
  @ApiConflictResponse({ description: 'Page key already exists.' })
  @ApiBadRequestResponse({
    description: 'Invalid page key or missing required fields.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(@Body() dto: CreatePageDto): Promise<PageResponseDto> {
    const page = await this.pageAdminService.create(dto);
    return page as unknown as PageResponseDto;
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update existing static page properties' })
  @ApiParam({ name: 'key', enum: PageKey, example: PageKey.ABOUT_FORUM })
  @ApiOkResponse({
    type: PageResponseDto,
    description: 'The updated static page.',
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageResponseDto> {
    const page = await this.pageAdminService.update(key, dto);
    return page as unknown as PageResponseDto;
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a static page by key or ObjectId' })
  @ApiParam({ name: 'key', example: 'about-forum' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Page not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async delete(@Param('key') key: string): Promise<{ success: boolean }> {
    return this.pageAdminService.delete(key);
  }
}

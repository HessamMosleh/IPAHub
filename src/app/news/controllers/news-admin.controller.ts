import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { NewsAdminService } from '../services/news-admin.service';
import { AdminListNewsDto } from '../dtos/admin-list-news.dto';
import { CreateNewsDto } from '../dtos/create-news.dto';
import { UpdateNewsDto } from '../dtos/update-news.dto';
import {
  NewsResponseDto,
  PaginatedNewsResponseDto,
} from '../dtos/news-response.dto';

/**
 * Administrative News Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards.
 */
@ApiTags('Admin - News')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/news')
export class NewsAdminController {
  constructor(private readonly newsAdminService: NewsAdminService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'List news posts with pagination, status/category/province/date filters, and admin scoping',
  })
  @ApiOkResponse({
    type: PaginatedNewsResponseDto,
    description: 'Paginated list of news posts.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListNewsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedNewsResponseDto> {
    const result = await this.newsAdminService.findAll(query, user);
    return result as unknown as PaginatedNewsResponseDto;
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get news post by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: NewsResponseDto,
    description: 'News post details.',
  })
  @ApiNotFoundResponse({ description: 'News post not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    const news = await this.newsAdminService.findById(id, user);
    return news as unknown as NewsResponseDto;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Create a new news post' })
  @ApiOkResponse({
    type: NewsResponseDto,
    description: 'The created news post.',
  })
  @ApiBadRequestResponse({
    description:
      'Missing required fields or province missing for provincial news.',
  })
  @ApiForbiddenResponse({
    description:
      'Outside assigned province scope or cannot create national news.',
  })
  async create(
    @Body() dto: CreateNewsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    const news = await this.newsAdminService.create(dto, user);
    return news as unknown as NewsResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Update an existing news post' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: NewsResponseDto,
    description: 'The updated news post.',
  })
  @ApiNotFoundResponse({ description: 'News post not found.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiForbiddenResponse({
    description:
      'Outside assigned province scope or cannot change to national.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<NewsResponseDto> {
    const news = await this.newsAdminService.update(id, dto, user);
    return news as unknown as NewsResponseDto;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a news post' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'News post not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.newsAdminService.delete(id, user);
  }
}

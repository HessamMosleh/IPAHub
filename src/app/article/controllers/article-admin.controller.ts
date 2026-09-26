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
import { ArticleAdminService } from '../services/article-admin.service';
import { AdminListArticleDto } from '../dtos/admin-list-article.dto';
import { CreateArticleDto } from '../dtos/create-article.dto';
import { UpdateArticleDto } from '../dtos/update-article.dto';
import {
  ArticleResponseDto,
  PaginatedArticlesResponseDto,
} from '../dtos/article-response.dto';

/**
 * Administrative Article Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards.
 */
@ApiTags('Admin - Articles')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/articles')
export class ArticleAdminController {
  constructor(private readonly articleAdminService: ArticleAdminService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'List articles with pagination, status/category/province/date filters, and admin scoping',
  })
  @ApiOkResponse({
    type: PaginatedArticlesResponseDto,
    description: 'Paginated list of articles.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListArticleDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedArticlesResponseDto> {
    const result = await this.articleAdminService.findAll(query, user);
    return result as unknown as PaginatedArticlesResponseDto;
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get article by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ArticleResponseDto,
    description: 'Article details.',
  })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    const article = await this.articleAdminService.findById(id, user);
    return article as unknown as ArticleResponseDto;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Create a new article' })
  @ApiOkResponse({
    type: ArticleResponseDto,
    description: 'The created article.',
  })
  @ApiBadRequestResponse({
    description:
      'Missing required fields or province missing for provincial article.',
  })
  @ApiForbiddenResponse({
    description:
      'Outside assigned province scope or cannot create national article.',
  })
  async create(
    @Body() dto: CreateArticleDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    const article = await this.articleAdminService.create(dto, user);
    return article as unknown as ArticleResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Update an existing article' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ArticleResponseDto,
    description: 'The updated article.',
  })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiForbiddenResponse({
    description:
      'Outside assigned province scope or cannot change to national.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ArticleResponseDto> {
    const article = await this.articleAdminService.update(id, dto, user);
    return article as unknown as ArticleResponseDto;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Soft-delete an article' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Article not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.articleAdminService.delete(id, user);
  }
}

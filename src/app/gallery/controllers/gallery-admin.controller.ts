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
import { GalleryAdminService } from '../services/gallery-admin.service';
import { AdminListGalleryImagesDto } from '../dtos/admin-list-gallery-images.dto';
import { CreateGalleryImageDto } from '../dtos/create-gallery-image.dto';
import { UpdateGalleryImageDto } from '../dtos/update-gallery-image.dto';
import { ReorderGalleryImageDto } from '../dtos/reorder-gallery-image.dto';
import {
  GalleryImageResponseDto,
  PaginatedGalleryImagesResponseDto,
} from '../dtos/gallery-image-response.dto';

/**
 * Administrative Gallery Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Gallery')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/gallery')
export class GalleryAdminController {
  constructor(
    private readonly galleryAdminService: GalleryAdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List gallery images with pagination and search filter',
  })
  @ApiOkResponse({
    type: PaginatedGalleryImagesResponseDto,
    description: 'Paginated list of gallery images.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListGalleryImagesDto,
  ): Promise<PaginatedGalleryImagesResponseDto> {
    const result = await this.galleryAdminService.findAll(query);
    return result as unknown as PaginatedGalleryImagesResponseDto;
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Idempotently seed the canonical 5 default gallery banners',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'number', example: 5 },
        total: { type: 'number', example: 5 },
      },
    },
  })
  async seed(): Promise<{ seeded: number; total: number }> {
    return this.galleryAdminService.seed();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get gallery image by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: GalleryImageResponseDto,
    description: 'Gallery image details.',
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found.' })
  async findById(
    @Param('id') id: string,
  ): Promise<GalleryImageResponseDto> {
    const image = await this.galleryAdminService.findById(id);
    return image as unknown as GalleryImageResponseDto;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new gallery image slide' })
  @ApiOkResponse({
    type: GalleryImageResponseDto,
    description: 'The created gallery image.',
  })
  async create(
    @Body() dto: CreateGalleryImageDto,
  ): Promise<GalleryImageResponseDto> {
    const image = await this.galleryAdminService.create(dto);
    return image as unknown as GalleryImageResponseDto;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update gallery image properties' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: GalleryImageResponseDto,
    description: 'The updated gallery image.',
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryImageDto,
  ): Promise<GalleryImageResponseDto> {
    const image = await this.galleryAdminService.update(id, dto);
    return image as unknown as GalleryImageResponseDto;
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle gallery image active status' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: GalleryImageResponseDto,
    description: 'The gallery image with toggled status.',
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found.' })
  async toggleStatus(
    @Param('id') id: string,
  ): Promise<GalleryImageResponseDto> {
    const image = await this.galleryAdminService.toggleStatus(id);
    return image as unknown as GalleryImageResponseDto;
  }

  @Patch(':id/reorder')
  @ApiOperation({
    summary: 'Reorder gallery image moving up or down in listing',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [GalleryImageResponseDto],
    description: 'Updated ordered gallery image list.',
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found.' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderGalleryImageDto,
  ): Promise<GalleryImageResponseDto[]> {
    const images = await this.galleryAdminService.reorder(id, dto);
    return images as unknown as GalleryImageResponseDto[];
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a gallery image' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found.' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.galleryAdminService.delete(id);
  }
}

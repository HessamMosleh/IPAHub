import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GalleryService } from '../services/gallery.service';
import { ListGalleryImagesDto } from '../dtos/list-gallery-images.dto';
import { GalleryImageResponseDto } from '../dtos/gallery-image-response.dto';

/**
 * Public/Client Gallery Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users,
 * exposing active gallery images with no administrative mutation capabilities.
 */
@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all active gallery images ordered for home page carousel',
  })
  @ApiOkResponse({
    type: [GalleryImageResponseDto],
    description: 'Active gallery images sorted by display order ascending.',
  })
  async findAll(
    @Query() query: ListGalleryImagesDto,
  ): Promise<GalleryImageResponseDto[]> {
    const images = await this.galleryService.findAllActive(query);
    return images as unknown as GalleryImageResponseDto[];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active gallery image by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Gallery image MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: GalleryImageResponseDto,
    description: 'The active gallery image details.',
  })
  @ApiNotFoundResponse({ description: 'Gallery image not found or inactive.' })
  async findById(@Param('id') id: string): Promise<GalleryImageResponseDto> {
    const image = await this.galleryService.findById(id);
    return image as unknown as GalleryImageResponseDto;
  }
}

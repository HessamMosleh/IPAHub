import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { GalleryImage, GalleryImageProp } from '../gallery-image.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { ListGalleryImagesDto } from '../dtos/list-gallery-images.dto';
import { IGalleryService } from '../interfaces/gallery-service.interface';

/**
 * Public/Client Gallery Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible, active gallery slides listed on the home page carousel.
 */
@Injectable()
export class GalleryService implements IGalleryService {
  constructor(
    @InjectModel(GalleryImage.name)
    private readonly galleryImageModel: Model<GalleryImage>,
  ) {}

  /**
   * Retrieves all active gallery slides sorted by display order ascending.
   * Optionally filters by search keyword across caption (EN and FA).
   */
  async findAllActive(query?: ListGalleryImagesDto): Promise<GalleryImage[]> {
    const filter: QueryFilter<GalleryImage> = {
      status: ActiveStatus.ACTIVE,
    };

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ 'caption.en': regex }, { 'caption.fa': regex }];
    }

    return this.galleryImageModel
      .find(filter)
      .select(GalleryImageProp.general)
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Retrieves a single active gallery slide by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<GalleryImage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const image = await this.galleryImageModel
      .findOne({ _id: id, status: ActiveStatus.ACTIVE })
      .select(GalleryImageProp.general)
      .exec();

    if (!image) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    return image;
  }
}

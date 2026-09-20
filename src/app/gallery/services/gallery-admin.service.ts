import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { GalleryImage, GalleryImageProp } from '../gallery-image.schema';
import { LocalizedText } from '../../../common/schemas/localized-text.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AdminListGalleryImagesDto } from '../dtos/admin-list-gallery-images.dto';
import { CreateGalleryImageDto } from '../dtos/create-gallery-image.dto';
import { UpdateGalleryImageDto } from '../dtos/update-gallery-image.dto';
import {
  ReorderDirection,
  ReorderGalleryImageDto,
} from '../dtos/reorder-gallery-image.dto';
import { DEFAULT_GALLERY_IMAGES } from '../constants/default-gallery-images';
import {
  IGalleryAdminService,
  PaginatedGalleryImages,
} from '../interfaces/gallery-admin-service.interface';

/**
 * Administrative Gallery Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative mutations, pagination, ordering, status toggles,
 * and canonical default seeding.
 */
@Injectable()
export class GalleryAdminService implements IGalleryAdminService {
  constructor(
    @InjectModel(GalleryImage.name)
    private readonly galleryImageModel: Model<GalleryImage>,
  ) {}

  /**
   * Lists gallery slides with pagination, status filter, and optional caption search filter.
   */
  async findAll(
    query?: AdminListGalleryImagesDto,
  ): Promise<PaginatedGalleryImages> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<GalleryImage> = {};

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ 'caption.en': regex }, { 'caption.fa': regex }];
    }

    const [data, total] = await Promise.all([
      this.galleryImageModel
        .find(filter)
        .select(GalleryImageProp.admin)
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.galleryImageModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves any gallery slide by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<GalleryImage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const image = await this.galleryImageModel
      .findById(id)
      .select(GalleryImageProp.admin)
      .exec();

    if (!image) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    return image;
  }

  /**
   * Creates a new gallery slide.
   */
  async create(dto: CreateGalleryImageDto): Promise<GalleryImage> {
    let order = dto.order;
    if (order === undefined || order === null) {
      const highest = await this.galleryImageModel
        .findOne()
        .sort({ order: -1 })
        .select('order')
        .exec();
      order = highest ? highest.order + 1 : 0;
    }

    const image = toMediaFile(dto.image);

    let caption: LocalizedText | undefined = undefined;
    if (dto.caption) {
      const en = dto.caption.en?.trim();
      const fa = dto.caption.fa?.trim();
      if (en || fa) {
        caption = {
          en: en ?? '',
          ...(fa ? { fa } : {}),
        };
      }
    }

    return this.galleryImageModel.create({
      image,
      caption,
      order,
      status: dto.status ?? ActiveStatus.ACTIVE,
    });
  }

  /**
   * Updates gallery slide properties (image, caption, order, status).
   */
  async update(id: string, dto: UpdateGalleryImageDto): Promise<GalleryImage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const imageDoc = await this.galleryImageModel.findById(id).exec();
    if (!imageDoc) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    if (dto.image) {
      imageDoc.image = toMediaFile(dto.image);
    }

    if (dto.caption !== undefined) {
      if (
        dto.caption === null ||
        (!dto.caption.en?.trim() && !dto.caption.fa?.trim())
      ) {
        imageDoc.caption = undefined;
      } else {
        imageDoc.caption = {
          en: dto.caption.en?.trim() ?? '',
          ...(dto.caption.fa?.trim() ? { fa: dto.caption.fa.trim() } : {}),
        };
      }
    }

    if (dto.order !== undefined) {
      imageDoc.order = dto.order;
    }

    if (dto.status !== undefined) {
      imageDoc.status = dto.status;
    }

    return imageDoc.save();
  }

  /**
   * Toggles gallery slide active status between ACTIVE and DISABLED.
   */
  async toggleStatus(id: string): Promise<GalleryImage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const imageDoc = await this.galleryImageModel.findById(id).exec();
    if (!imageDoc) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    imageDoc.status =
      imageDoc.status === ActiveStatus.ACTIVE
        ? ActiveStatus.DISABLED
        : ActiveStatus.ACTIVE;

    return imageDoc.save();
  }

  /**
   * Swaps order with adjacent gallery slide in the requested direction.
   */
  async reorder(
    id: string,
    dto: ReorderGalleryImageDto,
  ): Promise<GalleryImage[]> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const all = await this.galleryImageModel
      .find()
      .sort({ order: 1, createdAt: 1 })
      .exec();

    const i = all.findIndex((g) => g._id.toString() === id);
    if (i === -1) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    if (dto.dir === ReorderDirection.UP && i === 0) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_GALLERY_IMAGE'),
      );
    }

    if (dto.dir === ReorderDirection.DOWN && i === all.length - 1) {
      throw new BadRequestException(
        translate('errors.CANNOT_REORDER_GALLERY_IMAGE'),
      );
    }

    const j = dto.dir === ReorderDirection.UP ? i - 1 : i + 1;

    let orderI = all[i].order;
    let orderJ = all[j].order;

    if (orderI === orderJ) {
      orderI = i;
      orderJ = j;
    }

    await Promise.all([
      this.galleryImageModel.findByIdAndUpdate(all[i]._id, {
        order: orderJ,
      }),
      this.galleryImageModel.findByIdAndUpdate(all[j]._id, {
        order: orderI,
      }),
    ]);

    return this.galleryImageModel
      .find()
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Deletes a gallery slide by id.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    const res = await this.galleryImageModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(translate('errors.GALLERY_IMAGE_NOT_FOUND'));
    }

    return { success: true };
  }

  /**
   * Idempotently seeds the canonical default gallery images if they do not yet exist.
   */
  async seed(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const g of DEFAULT_GALLERY_IMAGES) {
      const existing = await this.galleryImageModel.findOne({
        $or: [
          { 'image.key': g.image.key },
          ...(g.caption ? [{ 'caption.en': g.caption.en }] : []),
        ],
      });
      if (!existing) {
        await this.galleryImageModel.create({
          image: {
            key: g.image.key,
            originalName: g.image.originalName,
            mimeType: g.image.mimeType,
            uploadedAt: new Date(),
          },
          caption: g.caption,
          order: g.order,
          status: ActiveStatus.ACTIVE,
        });
        seeded++;
      }
    }

    const total = await this.galleryImageModel.countDocuments();
    return { seeded, total };
  }
}

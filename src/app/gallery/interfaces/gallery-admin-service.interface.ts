import { GalleryImage } from '../gallery-image.schema';
import { AdminListGalleryImagesDto } from '../dtos/admin-list-gallery-images.dto';
import { CreateGalleryImageDto } from '../dtos/create-gallery-image.dto';
import { UpdateGalleryImageDto } from '../dtos/update-gallery-image.dto';
import { ReorderGalleryImageDto } from '../dtos/reorder-gallery-image.dto';

export interface PaginatedGalleryImages {
  data: GalleryImage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Contract for administrative gallery operations.
 * Segregated from the public client interface (ISP).
 */
export interface IGalleryAdminService {
  /**
   * Lists gallery images with pagination, status filter, and optional search filter.
   */
  findAll(query?: AdminListGalleryImagesDto): Promise<PaginatedGalleryImages>;

  /**
   * Retrieves any gallery image by id.
   */
  findById(id: string): Promise<GalleryImage>;

  /**
   * Creates a new gallery slide.
   */
  create(dto: CreateGalleryImageDto): Promise<GalleryImage>;

  /**
   * Updates gallery slide properties (image, caption, order, status).
   */
  update(id: string, dto: UpdateGalleryImageDto): Promise<GalleryImage>;

  /**
   * Toggles gallery slide active status between ACTIVE and DISABLED.
   */
  toggleStatus(id: string): Promise<GalleryImage>;

  /**
   * Swaps order with adjacent gallery slide in the requested direction.
   */
  reorder(id: string, dto: ReorderGalleryImageDto): Promise<GalleryImage[]>;

  /**
   * Deletes a gallery slide by id.
   */
  delete(id: string): Promise<{ success: boolean }>;

  /**
   * Idempotently seeds the canonical default gallery images if they do not yet exist.
   */
  seed(): Promise<{ seeded: number; total: number }>;
}

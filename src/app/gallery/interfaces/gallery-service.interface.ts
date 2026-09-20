import { GalleryImage } from '../gallery-image.schema';
import { ListGalleryImagesDto } from '../dtos/list-gallery-images.dto';

/**
 * Contract for public/client gallery queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for active gallery slides.
 */
export interface IGalleryService {
  /**
   * Returns all active gallery images, optionally filtered by keyword,
   * sorted by display order ascending.
   */
  findAllActive(query?: ListGalleryImagesDto): Promise<GalleryImage[]>;

  /**
   * Finds a single active gallery image by its MongoDB ObjectId.
   * Throws NotFoundException if not found or disabled.
   */
  findById(id: string): Promise<GalleryImage>;
}

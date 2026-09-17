import { MediaFile } from '../schemas/media-file.schema';
import { MediaFileDto } from '../dtos/media-file.dto';

/**
 * Build an embedded `MediaFile` from a required DTO. Prefer this when the
 * field is mandatory on the request (licence images, card sides).
 */
export function toMediaFile(dto: MediaFileDto): MediaFile;

/**
 * Build an embedded `MediaFile`, or `undefined` when the client cleared the
 * field (empty/missing key). Prefer this for optional media fields.
 */
export function toMediaFile(
  dto: MediaFileDto | null | undefined,
): MediaFile | undefined;

export function toMediaFile(
  dto: MediaFileDto | null | undefined,
): MediaFile | undefined {
  if (!dto?.key?.trim()) {
    return undefined;
  }

  return {
    key: dto.key.trim(),
    mimeType: dto.mimeType?.trim() || undefined,
    size: dto.size,
    originalName: dto.originalName?.trim() || undefined,
    width: dto.width,
    height: dto.height,
    uploadedAt: new Date(),
  };
}

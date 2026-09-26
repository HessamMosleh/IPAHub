import {
  ALLOWED_UPLOAD_MIME_TYPES,
  isAllowedDocumentMime,
  isAllowedPhotoMime,
  isAllowedUploadMime,
} from './upload-limits';

describe('upload-limits', () => {
  it('allows the formats the product uploads through /storage/upload', () => {
    expect(ALLOWED_UPLOAD_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]);
    for (const mime of ALLOWED_UPLOAD_MIME_TYPES) {
      expect(isAllowedUploadMime(mime)).toBe(true);
    }
  });

  it('rejects SVG, octet-stream, and empty MIME types', () => {
    expect(isAllowedUploadMime('image/svg+xml')).toBe(false);
    expect(isAllowedUploadMime('application/octet-stream')).toBe(false);
    expect(isAllowedUploadMime(undefined)).toBe(false);
    expect(isAllowedUploadMime('')).toBe(false);
  });

  it('restricts member photos to JPEG/PNG/WebP', () => {
    expect(isAllowedPhotoMime('image/jpeg')).toBe(true);
    expect(isAllowedPhotoMime('image/gif')).toBe(false);
    expect(isAllowedPhotoMime('application/pdf')).toBe(false);
  });

  it('allows PDF and common images for member documents', () => {
    expect(isAllowedDocumentMime('application/pdf')).toBe(true);
    expect(isAllowedDocumentMime('image/png')).toBe(true);
    expect(isAllowedDocumentMime('image/gif')).toBe(false);
  });
});

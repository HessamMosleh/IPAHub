/**
 * MIME types accepted by upload endpoints.
 *
 * Matches what the admin/member UIs actually send:
 * - images for covers, gallery, posters, logos, portraits, licences, editor embeds
 * - PDF for resumes, issued documents, certificates
 *
 * SVG is intentionally excluded (seed assets only; XSS surface if uploaded).
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Member portrait uploads (no GIF — used on membership cards). */
export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Member document uploads and similar private attachments. */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Combined allowlist for `POST /storage/upload` (admin images + PDFs). */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  'application/pdf',
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

function includesMime(
  list: readonly string[],
  mime: string | undefined,
): boolean {
  return !!mime && list.includes(mime);
}

export function isAllowedUploadMime(
  mime: string | undefined,
): mime is AllowedUploadMimeType {
  return includesMime(ALLOWED_UPLOAD_MIME_TYPES, mime);
}

export function isAllowedImageMime(mime: string | undefined): boolean {
  return includesMime(ALLOWED_IMAGE_MIME_TYPES, mime);
}

export function isAllowedPhotoMime(mime: string | undefined): boolean {
  return includesMime(ALLOWED_PHOTO_MIME_TYPES, mime);
}

export function isAllowedDocumentMime(mime: string | undefined): boolean {
  return includesMime(ALLOWED_DOCUMENT_MIME_TYPES, mime);
}

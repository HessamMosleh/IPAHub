/**
 * Generates a clean, URL-safe kebab-case slug from an input string.
 * Falls back to 'type' if no ASCII alphanumeric characters are present.
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'type'
  );
}

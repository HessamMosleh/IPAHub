/**
 * Folds Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits (0-9).
 * Rewrites any non-ASCII digit character to its corresponding ASCII representation,
 * leaving all other characters untouched.
 */
export function foldDigits(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
}

const HTTP_URL = /^https?:\/\//i;
const PHONE_SHAPED = /^\+?[\d\s()./-]+$/;

/**
 * Folds Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits (0-9).
 */
export function foldDigits(val: string): string {
  if (!val) return '';
  return val
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
}

/**
 * Normalizes an Iranian mobile or phone number to the international +98 format.
 */
export function normalizePhone(raw: string): string {
  const digits = foldDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) {
    return `+98${digits.slice(1)}`;
  }
  if (digits.startsWith('98') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `+98${digits}`;
  }
  return raw.trim();
}

/**
 * Turn user/admin entered URL into a safe, normalized https:// link.
 * Returns empty string if invalid or scheme is forbidden.
 */
export function normalizeSocialUrl(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (HTTP_URL.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return ''; // reject unexpected schemes (e.g. javascript:)
  if (!trimmed.includes('.') || /\s/.test(trimmed)) return '';
  return `https://${trimmed}`;
}

/**
 * Normalizes WhatsApp link. Supports either full URL (e.g. https://wa.me/...)
 * or phone number (e.g. 09121234567, +98912...), converting phone numbers to https://wa.me/98...
 */
export function normalizeWhatsapp(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (HTTP_URL.test(trimmed)) return trimmed;

  const folded = foldDigits(trimmed);
  if (PHONE_SHAPED.test(folded)) {
    const phone = normalizePhone(folded);
    if (/^\+98\d{10}$/.test(phone)) {
      return `https://wa.me/${phone.slice(1)}`;
    }
    return '';
  }

  return normalizeSocialUrl(trimmed);
}

export interface DefaultRequestType {
  slug: string;
  name: { en: string; fa: string };
  baseFee: number;
  producesDocument: boolean;
  order: number;
}

/**
 * The canonical seeded request types mirrored from the Consultants Association specification.
 * `membership-card` is system-fulfilled; all others produce documents issued by admins.
 */
export const DEFAULT_REQUEST_TYPES: readonly DefaultRequestType[] = [
  {
    slug: 'membership-card',
    name: { en: 'Membership card', fa: 'کارت عضویت' },
    baseFee: 500_000,
    producesDocument: true,
    order: 0,
  },
  {
    slug: 'insurance-letter',
    name: { en: 'Insurance letter', fa: 'معرفی‌نامه بیمه' },
    baseFee: 0,
    producesDocument: true,
    order: 1,
  },
  {
    slug: 'bank-letter',
    name: { en: 'Bank letter', fa: 'معرفی‌نامه بانکی' },
    baseFee: 0,
    producesDocument: true,
    order: 2,
  },
  {
    slug: 'tara-letter',
    name: { en: 'Tara letter', fa: 'نامه تارا' },
    baseFee: 0,
    producesDocument: true,
    order: 3,
  },
  {
    slug: 'membership-certificate',
    name: { en: 'Membership certificate', fa: 'گواهی عضویت' },
    baseFee: 0,
    producesDocument: true,
    order: 4,
  },
] as const;

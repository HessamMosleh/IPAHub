import { LocalizedText } from '../../../common/schemas/localized-text.schema';

export interface DefaultGalleryImage {
  image: {
    key: string;
    originalName?: string;
    mimeType?: string;
  };
  caption?: LocalizedText;
  order: number;
}

/**
 * The canonical 5 default gallery banners from the association CMS seed.
 * Seeded idempotently by image key or English caption matching.
 */
export const DEFAULT_GALLERY_IMAGES: DefaultGalleryImage[] = [
  {
    image: {
      key: 'seed/banner-association.svg',
      originalName: 'banner-association.svg',
      mimeType: 'image/svg+xml',
    },
    caption: {
      en: 'Industrial Consultants Association',
      fa: 'انجمن مشاوران صنعتی',
    },
    order: 0,
  },
  {
    image: {
      key: 'seed/banner-conference.svg',
      originalName: 'banner-conference.svg',
      mimeType: 'image/svg+xml',
    },
    caption: {
      en: 'National conference on industrial development',
      fa: 'همایش ملی توسعه صنعتی',
    },
    order: 1,
  },
  {
    image: {
      key: 'seed/banner-workshop.svg',
      originalName: 'banner-workshop.svg',
      mimeType: 'image/svg+xml',
    },
    caption: {
      en: 'Professional training workshops',
      fa: 'کارگاه‌های آموزشی حرفه‌ای',
    },
    order: 2,
  },
  {
    image: {
      key: 'seed/banner-members.svg',
      originalName: 'banner-members.svg',
      mimeType: 'image/svg+xml',
    },
    caption: {
      en: 'A nationwide community of members',
      fa: 'جامعه‌ای سراسری از اعضا',
    },
    order: 3,
  },
  {
    image: {
      key: 'seed/banner-industry.svg',
      originalName: 'banner-industry.svg',
      mimeType: 'image/svg+xml',
    },
    caption: {
      en: 'Supporting industrial development',
      fa: 'پشتیبانی از توسعه صنعتی',
    },
    order: 4,
  },
];

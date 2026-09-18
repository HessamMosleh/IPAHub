export interface DefaultCommunityService {
  title: { en: string; fa?: string };
  description: { en: string; fa?: string };
  order: number;
}

/**
 * The canonical 4 default community services from the association CMS seed.
 * Seeded idempotently by English title matching.
 */
export const DEFAULT_COMMUNITY_SERVICES: DefaultCommunityService[] = [
  {
    title: { en: 'Professional Training', fa: 'آموزش حرفه‌ای' },
    description: {
      en: "Workshops, webinars and courses to keep members' technical and professional skills current.",
      fa: 'کارگاه‌ها، وبینارها و دوره‌هایی برای به‌روز نگه‌داشتن مهارت‌های فنی و حرفه‌ای اعضا.',
    },
    order: 0,
  },
  {
    title: { en: 'Membership Documents', fa: 'مدارک عضویت' },
    description: {
      en: 'Official membership cards, insurance and bank letters issued online through the member portal.',
      fa: 'کارت عضویت رسمی، نامه‌های بیمه و بانکی که به صورت برخط از طریق درگاه اعضا صادر می‌شوند.',
    },
    order: 1,
  },
  {
    title: { en: 'Professional Networking', fa: 'شبکه‌سازی حرفه‌ای' },
    description: {
      en: 'Events and forums that connect consulting engineers with peers, industry and policymakers.',
      fa: 'رویدادها و نشست‌هایی که مهندسان مشاور را با همکاران، صنعت و سیاست‌گذاران پیوند می‌دهند.',
    },
    order: 2,
  },
  {
    title: { en: 'Advocacy & Representation', fa: 'پیگیری و نمایندگی صنفی' },
    description: {
      en: 'Representing the collective interests of industrial consultants before public and private institutions.',
      fa: 'نمایندگی منافع جمعی مشاوران صنعتی نزد نهادهای عمومی و خصوصی.',
    },
    order: 3,
  },
];

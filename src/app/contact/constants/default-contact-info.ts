export interface DefaultContactInfo {
  key: string;
  address: { en: string; fa?: string };
  phone: string;
  email: string;
  socials: {
    telegram?: string;
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
}

/**
 * The canonical default contact info matching the association CMS seed.
 */
export const DEFAULT_CONTACT_INFO: DefaultContactInfo = {
  key: 'main',
  address: {
    en: 'No. 12, Consulting Engineers Building, Vali-e-Asr Ave., Tehran, Iran',
    fa: 'تهران، خیابان ولیعصر، ساختمان مهندسان مشاور، پلاک ۱۲',
  },
  phone: '+98 21 8888 0000',
  email: 'info@ipa.example',
  socials: {
    telegram: 'https://t.me/ipa_example',
    instagram: 'https://instagram.com/ipa_example',
    whatsapp: 'https://wa.me/982188880000',
    facebook: 'https://facebook.com/ipa_example',
  },
};

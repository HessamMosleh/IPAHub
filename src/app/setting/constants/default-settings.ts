import { SiteSettingKey } from '../site-setting.schema';
import { MemberSettingKey } from '../member-setting.schema';

/**
 * Social network setting keys.
 */
export const SOCIAL_SETTING_KEYS: readonly SiteSettingKey[] = [
  SiteSettingKey.FACEBOOK,
  SiteSettingKey.INSTAGRAM,
  SiteSettingKey.TELEGRAM,
  SiteSettingKey.WHATSAPP,
] as const;

/**
 * Default canonical site settings.
 */
export const DEFAULT_SITE_SETTINGS: Record<SiteSettingKey, string> = {
  [SiteSettingKey.ASSOCIATION_NAME]:
    'Iranian Petroleum Consultants Association',
  [SiteSettingKey.LOGO_KEY]: '',
  [SiteSettingKey.FACEBOOK]: 'https://facebook.com/ipa',
  [SiteSettingKey.INSTAGRAM]: 'https://instagram.com/ipa',
  [SiteSettingKey.TELEGRAM]: 'https://t.me/ipa',
  [SiteSettingKey.WHATSAPP]: 'https://wa.me/982188880000',
};

/**
 * Default internal member workflow settings.
 */
export const DEFAULT_MEMBER_SETTINGS: Record<MemberSettingKey, string> = {
  [MemberSettingKey.MEMBERSHIP_NO_SEQUENCE]: '1000',
};

import { I18nContext } from 'nestjs-i18n';

/**
 * Translate a key using the active request language (Accept-Language / ?lang= / x-lang).
 * Falls back to the key itself when no i18n context is available (e.g. outside a request).
 */
export function translate(key: string, args?: Record<string, unknown>): string {
  const i18n = I18nContext.current();
  if (!i18n) {
    return key;
  }
  return i18n.t(key, { args });
}

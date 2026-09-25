import { toInternationalMobile } from '../../common/utils/mobile.util';

/**
 * Parse TEST_OTP_NUMBERS env (e.g. "09120000002:12345,09120000003:54321")
 * into a map of mobile → fixed code. Keys are normalised to E.164
 * international format (+98…) so they match the DB representation.
 * Used while no SMS gateway is live.
 */
export function parseFixedOtps(
  raw: string | undefined | null,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw?.trim()) return map;

  for (const entry of raw.split(',')) {
    const [mobile, code] = entry.split(':').map((s) => s?.trim());
    if (mobile && code) {
      map.set(toInternationalMobile(mobile), code);
    }
  }
  return map;
}

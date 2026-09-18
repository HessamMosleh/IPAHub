/** 30-day grace period after expiry during which membership entitlements still apply. */
export const MEMBERSHIP_GRACE_DAYS = 30;

/**
 * Adds exactly one year to a date, clamping 29 February to 28 February so a
 * membership issued on a leap day does not silently roll forward to 1 March.
 */
export function addOneYear(from: Date): Date {
  const result = new Date(from.getTime());
  const month = result.getMonth();
  result.setFullYear(result.getFullYear() + 1);
  // Overflowed into the next month (Feb 29 -> Mar 1): pull back to the last day
  // of the intended month.
  if (result.getMonth() !== month) {
    result.setDate(0);
  }
  return result;
}

/**
 * The start point for a renewed term. An early renewal (before expiry) preserves
 * the unused remainder by extending from the existing expiry; a lapsed renewal
 * starts fresh from today.
 */
export function renewalStart(now: Date, currentExpiry?: Date | null): Date {
  if (currentExpiry && currentExpiry.getTime() > now.getTime()) {
    return new Date(currentExpiry.getTime());
  }
  return now;
}

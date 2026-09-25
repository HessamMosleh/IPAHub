import { foldDigits } from './digit.util';
/**
 * Convert any common Iranian mobile form (local `09…`, international
 * `+98…`, or `0098…`) to E.164 international format (`+989XXXXXXXXX`).
 */
export function toInternationalMobile(raw: string): string {
  const digits = foldDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('0098')) return '+' + digits.slice(2);
  if (digits.startsWith('98')) return '+' + digits;
  if (digits.startsWith('0')) return '+98' + digits.slice(1);
  return '+98' + digits;
}

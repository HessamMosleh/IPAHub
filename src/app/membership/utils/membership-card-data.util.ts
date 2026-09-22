import { MembershipType } from '../../../common/enums/membership-type.enum';
import { EducationLevel } from '../../user/user.schema';
import { addOneYear } from './membership-term.util';

/**
 * Persian level names for the card.
 * Card text is Persian regardless of the request locale.
 */
const LEVEL_NAMES: Record<string, string> = {
  [EducationLevel.POSTDOC]: 'پسادکتری',
  [EducationLevel.PHD]: 'دکتری',
  [EducationLevel.MASTERS]: 'کارشناسی ارشد',
  [EducationLevel.BACHELORS]: 'کارشناسی',
  [EducationLevel.STUDENT]: 'دانشجو',
  [EducationLevel.OTHER]: '',
};

export interface CardEducation {
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
}

/**
 * The card's «رشته تحصیلی» row, built from the member's education attributes.
 *
 * Types with no academic row — HONORARY — return null and the row is dropped.
 */
export function fieldOfStudyFor(
  type: MembershipType | string,
  education?: CardEducation | null,
): string | null {
  const normType = String(type).toLowerCase() as MembershipType;
  if (normType === MembershipType.HONORARY) {
    return null;
  }
  if (!education) return null;
  const field = education.fieldOfStudy?.trim() ?? '';
  if (!field) return null;

  const levelKey = education.educationLevel?.toLowerCase();
  const level = levelKey && LEVEL_NAMES[levelKey] ? LEVEL_NAMES[levelKey] : '';
  return level ? `${level} ${field}` : field;
}

/**
 * When the printed card stops being valid.
 *
 * A card is sold for a year, but it is an official document asserting a
 * membership — so it can never outlive the membership itself. A member with two
 * months of term left gets a two-month card, not a twelve-month one.
 *
 * `membershipExpiresAt` is null for HONORARY and for the fail-open case, and
 * then the plain one-year term applies.
 */
export function cardExpiry(
  issuedAt: Date,
  membershipExpiresAt?: Date | null,
): Date {
  const oneYear = addOneYear(issuedAt);
  if (membershipExpiresAt && membershipExpiresAt < oneYear) {
    return membershipExpiresAt;
  }
  return oneYear;
}

const PERSIAN_PARTS = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export function toJalali(date: Date): JalaliDate {
  const parts = Object.fromEntries(
    PERSIAN_PARTS.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return {
    jy: Number(parts.year),
    jm: Number(parts.month),
    jd: Number(parts.day),
  };
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Converts ASCII digits to Persian digits for display on the membership card.
 */
export function toPersianDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Formats a Gregorian date as a zero-padded Jalali date string in Persian digits.
 * E.g. 2026-07-30 -> ۱۴۰۵/۰۵/۰۸
 */
export function formatCardDate(date: Date): string {
  const { jy, jm, jd } = toJalali(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`);
}

export interface CardDataInput {
  fullName: string;
  latinName?: string | null;
  nationalCode: string;
  membershipNo: number;
  membershipType: MembershipType | string;
  education?: CardEducation | null;
  issuedAt: Date;
  membershipExpiresAt?: Date | null;
}

export interface CardData {
  fullName: string;
  latinName: string | null;
  nationalCodeText: string;
  membershipNoText: string;
  fieldOfStudy: string | null;
  expiresAt: Date;
  expiresAtText: string;
  membershipType: MembershipType;
}

export function buildCardData(input: CardDataInput): CardData {
  const expiresAt = cardExpiry(input.issuedAt, input.membershipExpiresAt);
  const normType = input.membershipType.toLowerCase() as MembershipType;

  return {
    fullName: input.fullName.trim(),
    latinName: input.latinName?.trim() || null,
    nationalCodeText: toPersianDigits(input.nationalCode),
    membershipNoText: toPersianDigits(String(input.membershipNo)),
    fieldOfStudy: fieldOfStudyFor(normType, input.education),
    expiresAt,
    expiresAtText: formatCardDate(expiresAt),
    membershipType: normType,
  };
}

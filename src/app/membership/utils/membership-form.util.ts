import { MembershipType } from '../../../common/enums/membership-type.enum';
import { foldDigits } from '../../../common/utils/digit.util';
import {
  MEMBERSHIP_FORM_FIELDS,
  MembershipFieldDescriptor,
  MembershipFieldKind,
  NUMERIC_FIELD_KINDS,
} from '../schemas/membership-form-fields';

/** The longest any single free-text answer may be. */
const MAX_FIELD_LENGTH = 2000;

export interface ParsedMembershipForm {
  /** True when every required field was supplied. */
  ok: boolean;
  /** The trimmed, digit-folded answers, keyed as in the descriptor registry. */
  data: Record<string, string>;
  /** Keys of required fields that were missing or blank. */
  missing: string[];
}

/**
 * Normalises and validates the presence of a tier's application answers against
 * `MEMBERSHIP_FORM_FIELDS`.
 *
 * Each answer is trimmed; numeric-kind answers are folded to ASCII digits so a
 * Persian keyboard's `۰۹۱۲` is stored as `0912`. Empty optional answers are
 * dropped; empty required answers are collected in `missing`. Keys not in the
 * tier's descriptor set are ignored entirely — an application only records the
 * questions that were actually asked.
 */
export function parseMembershipForm(
  type: MembershipType,
  raw: Record<string, unknown>,
): ParsedMembershipForm {
  const descriptors: MembershipFieldDescriptor[] =
    MEMBERSHIP_FORM_FIELDS[type] ?? [];

  const data: Record<string, string> = {};
  const missing: string[] = [];

  for (const field of descriptors) {
    const rawValue = raw?.[field.key];
    let value = typeof rawValue === 'string' ? rawValue.trim() : '';

    if (value && NUMERIC_FIELD_KINDS.has(field.kind)) {
      value = foldDigits(value).trim();
    }

    if (!value) {
      if (field.required) {
        missing.push(field.key);
      }
      continue;
    }

    data[field.key] = value;
  }

  return { ok: missing.length === 0, data, missing };
}

/** Whether `value` is a real calendar date in strict `YYYY-MM-DD` form. */
function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validates the FORMAT of already-parsed answers per field kind: four-digit
 * years, ten-digit postal codes, real `YYYY-MM-DD` dates, and a maximum length
 * on everything. Presence is `parseMembershipForm`'s job; this is the second
 * pass on what was supplied.
 */
export function hasValidFormats(
  type: MembershipType,
  data: Record<string, string>,
): boolean {
  const descriptors: MembershipFieldDescriptor[] =
    MEMBERSHIP_FORM_FIELDS[type] ?? [];

  for (const field of descriptors) {
    const value = data[field.key];
    if (!value) continue;

    if (value.length > MAX_FIELD_LENGTH) return false;

    switch (field.kind) {
      case MembershipFieldKind.YEAR:
        if (!/^\d{4}$/.test(value)) return false;
        break;
      case MembershipFieldKind.POSTAL:
        if (!/^\d{10}$/.test(value)) return false;
        break;
      case MembershipFieldKind.DATE:
        if (!isValidIsoDate(value)) return false;
        break;
      default:
        break;
    }
  }

  return true;
}

/**
 * The descriptor key holding a province id for this tier, if any. Used to run the
 * one foreign-key check the registry cannot express: that the submitted province
 * actually exists.
 */
export function provinceFieldKey(type: MembershipType): string | null {
  const descriptors: MembershipFieldDescriptor[] =
    MEMBERSHIP_FORM_FIELDS[type] ?? [];
  const field = descriptors.find(
    (f) => f.kind === MembershipFieldKind.PROVINCE,
  );
  return field ? field.key : null;
}

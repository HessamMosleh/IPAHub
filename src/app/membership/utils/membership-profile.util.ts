import { User } from '../../user/user.schema';
import { MemberDocumentKind } from '../../user/member-document.schema';

/**
 * The identity and education fields a member must fill in before applying for any
 * tier. Kept here, next to the application flow that enforces it, rather than on
 * the User schema, where an incomplete legacy profile would otherwise be unable
 * to save anything at all.
 */
export const REQUIRED_PROFILE_FIELDS: readonly string[] = [
  'fullName',
  'latinFullName',
  'nationalCode',
  'sex',
  'birthday',
  'fatherName',
  'idNumber',
  'idIssuancePlace',
  'province',
  'educationLevel',
  'fieldOfStudy',
  'university',
];

/** The one document every applicant must have uploaded regardless of tier. */
export const REQUIRED_PROFILE_DOCUMENT =
  MemberDocumentKind.EDUCATION_CERTIFICATE;

/**
 * Whether a member's profile is complete enough to apply: every required field
 * is present and the education certificate has been uploaded.
 */
export function isProfileComplete(
  user: User,
  documentKinds: Set<MemberDocumentKind>,
): boolean {
  const record = user as unknown as Record<string, unknown>;
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = record[field];
    if (value === undefined || value === null || value === '') {
      return false;
    }
  }

  return documentKinds.has(REQUIRED_PROFILE_DOCUMENT);
}

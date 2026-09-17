/**
 * The membership tiers the association offers.
 *
 * Lives in `common/` rather than beside the membership schemas because it is
 * read from four directions at once: the user's current tier, the fee table,
 * the tier's marketing copy, the request being decided, the card being printed
 * and the payment ledger's snapshot of what was bought.
 *
 * `HONORARY` is granted by an admin, never applied for: it has no form fields,
 * no required document and no expiry date.
 */
export enum MembershipType {
  REGULAR = 'regular',
  AFFILIATE = 'affiliate',
  STUDENT = 'student',
  HONORARY = 'honorary',
}

/** The tiers a user may actually apply for. `HONORARY` is granted, not requested. */
export const APPLICABLE_MEMBERSHIP_TYPES: readonly MembershipType[] = [
  MembershipType.REGULAR,
  MembershipType.AFFILIATE,
  MembershipType.STUDENT,
];

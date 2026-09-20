export type CardBlocker =
  'photo' | 'latinName' | 'membershipType' | 'membershipNo';

export interface CardEligibilityUserInput {
  photo?: { key?: string } | null;
  latinFullName?: string | null;
  membershipType?: string | null;
  membershipNo?: number | null;
}

/**
 * Returns an array of missing prerequisites blocking membership card issuance,
 * in logical order:
 * 1. photo - Personal photo uploaded
 * 2. latinName - Latin/English name filled
 * 3. membershipType - Active approved membership tier assigned
 * 4. membershipNo - Official membership number allocated
 */
export function getCardBlockers(
  user?: CardEligibilityUserInput | null,
): CardBlocker[] {
  const blockers: CardBlocker[] = [];
  if (!user) {
    return ['photo', 'latinName', 'membershipType', 'membershipNo'];
  }

  if (!user.photo?.key?.trim()) {
    blockers.push('photo');
  }

  if (!user.latinFullName?.trim()) {
    blockers.push('latinName');
  }

  if (!user.membershipType) {
    blockers.push('membershipType');
  }

  if (user.membershipNo === undefined || user.membershipNo === null) {
    blockers.push('membershipNo');
  }

  return blockers;
}

/**
 * Evaluates whether a member meets all eligibility criteria for requesting a membership card.
 */
export function isCardEligible(
  user?: CardEligibilityUserInput | null,
): boolean {
  return getCardBlockers(user).length === 0;
}

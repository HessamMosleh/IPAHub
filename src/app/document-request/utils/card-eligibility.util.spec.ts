import { getCardBlockers, isCardEligible } from './card-eligibility.util';

/**
 * Factory function ensuring each test receives a fresh deep copy,
 * preventing shared-reference mutation between isolated tests.
 */
function buildCompleteUser() {
  return {
    photo: { key: 'portraits/user-123.jpg' },
    latinFullName: 'Ali Rezaei',
    membershipType: 'regular',
    membershipNo: 1001,
  };
}

describe('card-eligibility.util', () => {
  describe('getCardBlockers', () => {
    it('returns empty array when all prerequisites are met', () => {
      expect(getCardBlockers(buildCompleteUser())).toEqual([]);
    });

    it('returns all blockers when user is undefined or null', () => {
      expect(getCardBlockers(null)).toEqual([
        'photo',
        'latinName',
        'membershipType',
        'membershipNo',
      ]);
      expect(getCardBlockers(undefined)).toEqual([
        'photo',
        'latinName',
        'membershipType',
        'membershipNo',
      ]);
    });

    it('detects missing photo', () => {
      const user = { ...buildCompleteUser(), photo: undefined };
      expect(getCardBlockers(user)).toEqual(['photo']);

      const userEmptyPhoto = { ...buildCompleteUser(), photo: { key: '   ' } };
      expect(getCardBlockers(userEmptyPhoto)).toEqual(['photo']);
    });

    it('detects missing latin name', () => {
      const user = { ...buildCompleteUser(), latinFullName: '' };
      expect(getCardBlockers(user)).toEqual(['latinName']);

      const userSpaces = { ...buildCompleteUser(), latinFullName: '   ' };
      expect(getCardBlockers(userSpaces)).toEqual(['latinName']);
    });

    it('detects missing membership tier', () => {
      const user = { ...buildCompleteUser(), membershipType: null };
      expect(getCardBlockers(user)).toEqual(['membershipType']);
    });

    it('detects missing membership number', () => {
      const user = { ...buildCompleteUser(), membershipNo: null };
      expect(getCardBlockers(user)).toEqual(['membershipNo']);

      const userUndef = { ...buildCompleteUser(), membershipNo: undefined };
      expect(getCardBlockers(userUndef)).toEqual(['membershipNo']);
    });

    it('maintains consistent ordering of multiple blockers', () => {
      const emptyProfile = {};
      expect(getCardBlockers(emptyProfile)).toEqual([
        'photo',
        'latinName',
        'membershipType',
        'membershipNo',
      ]);
    });
  });

  describe('isCardEligible', () => {
    it('returns true when user has no blockers', () => {
      expect(isCardEligible(buildCompleteUser())).toBe(true);
    });

    it('returns false when user has any blockers', () => {
      expect(isCardEligible(null)).toBe(false);
      expect(isCardEligible({ ...buildCompleteUser(), photo: undefined })).toBe(
        false,
      );
    });
  });
});

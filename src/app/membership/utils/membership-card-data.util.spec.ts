import {
  fieldOfStudyFor,
  cardExpiry,
  formatCardDate,
  toPersianDigits,
  buildCardData,
} from './membership-card-data.util';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { EducationLevel } from '../../user/user.schema';

describe('fieldOfStudyFor', () => {
  it("joins the member's education level and field of study", () => {
    expect(
      fieldOfStudyFor(MembershipType.STUDENT, {
        educationLevel: EducationLevel.MASTERS,
        fieldOfStudy: 'روان شناسی بالینی',
      }),
    ).toBe('کارشناسی ارشد روان شناسی بالینی');
  });

  it("uses the field alone when the level is 'other'", () => {
    expect(
      fieldOfStudyFor(MembershipType.REGULAR, {
        educationLevel: EducationLevel.OTHER,
        fieldOfStudy: 'روان‌سنجی',
      }),
    ).toBe('روان‌سنجی');
  });

  it('uses the field alone when the level is not in known levels', () => {
    expect(
      fieldOfStudyFor(MembershipType.REGULAR, {
        educationLevel: 'unknown_level',
        fieldOfStudy: 'روان‌سنجی',
      }),
    ).toBe('روان‌سنجی');
  });

  it('returns null when the member has no field of study', () => {
    expect(
      fieldOfStudyFor(MembershipType.REGULAR, {
        educationLevel: EducationLevel.PHD,
        fieldOfStudy: null,
      }),
    ).toBeNull();
    expect(
      fieldOfStudyFor(MembershipType.REGULAR, {
        educationLevel: null,
        fieldOfStudy: '   ',
      }),
    ).toBeNull();
  });

  it('returns null for HONORARY even with education on file', () => {
    expect(
      fieldOfStudyFor(MembershipType.HONORARY, {
        educationLevel: EducationLevel.MASTERS,
        fieldOfStudy: 'روان‌شناسی',
      }),
    ).toBeNull();
    expect(
      fieldOfStudyFor('HONORARY', {
        educationLevel: EducationLevel.MASTERS,
        fieldOfStudy: 'روان‌شناسی',
      }),
    ).toBeNull();
  });

  it('returns null when no education is supplied at all', () => {
    expect(fieldOfStudyFor(MembershipType.REGULAR, null)).toBeNull();
    expect(fieldOfStudyFor(MembershipType.REGULAR, undefined)).toBeNull();
  });
});

describe('cardExpiry', () => {
  const issued = new Date('2026-08-17T00:00:00Z');

  it('is one year out when the membership runs longer than that', () => {
    const membership = new Date('2028-01-01T00:00:00Z');
    expect(cardExpiry(issued, membership).toISOString()).toBe(
      '2027-08-17T00:00:00.000Z',
    );
  });

  it('is capped at the membership expiry when that comes first', () => {
    const membership = new Date('2026-10-17T00:00:00Z');
    expect(cardExpiry(issued, membership).toISOString()).toBe(
      '2026-10-17T00:00:00.000Z',
    );
  });

  it('falls back to one year when the membership has no expiry', () => {
    expect(cardExpiry(issued, null).toISOString()).toBe(
      '2027-08-17T00:00:00.000Z',
    );
  });

  it('steps 29 February back rather than into March', () => {
    expect(
      cardExpiry(new Date('2024-02-29T00:00:00Z'), null).toISOString(),
    ).toBe('2025-02-28T00:00:00.000Z');
  });
});

describe('toPersianDigits', () => {
  it('converts ASCII digits to Persian digits', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(toPersianDigits(1016)).toBe('۱۰۱۶');
    expect(toPersianDigits('code: 0012345678')).toBe('code: ۰۰۱۲۳۴۵۶۷۸');
  });
});

describe('formatCardDate', () => {
  it('formats as zero-padded Jalali with Persian digits', () => {
    // 2026-07-30 Gregorian is 1405/05/08 Jalali
    expect(formatCardDate(new Date('2026-07-30T12:00:00.000Z'))).toBe(
      '۱۴۰۵/۰۵/۰۸',
    );
  });
});

describe('buildCardData', () => {
  const base = {
    fullName: 'پروانه یزدان پناه',
    latinName: 'Parvaneh Yazdanpanah',
    nationalCode: '4433447625',
    membershipNo: 1016,
    membershipType: MembershipType.STUDENT,
    education: {
      educationLevel: EducationLevel.MASTERS,
      fieldOfStudy: 'روان شناسی بالینی',
    },
    issuedAt: new Date('2026-07-30T12:00:00.000Z'),
    membershipExpiresAt: null,
  };

  it('assembles the printed values', () => {
    const d = buildCardData(base);
    expect(d.fullName).toBe('پروانه یزدان پناه');
    expect(d.latinName).toBe('Parvaneh Yazdanpanah');
    expect(d.nationalCodeText).toBe('۴۴۳۳۴۴۷۶۲۵');
    expect(d.membershipNoText).toBe('۱۰۱۶');
    expect(d.fieldOfStudy).toBe('کارشناسی ارشد روان شناسی بالینی');
    expect(d.expiresAt.toISOString().slice(0, 10)).toBe('2027-07-30');
    expect(d.expiresAtText).toBe('۱۴۰۶/۰۵/۰۸');
    expect(d.membershipType).toBe(MembershipType.STUDENT);
  });

  it('keeps a null field of study for HONORARY', () => {
    expect(
      buildCardData({ ...base, membershipType: MembershipType.HONORARY })
        .fieldOfStudy,
    ).toBeNull();
  });

  it('tolerates missing Latin name', () => {
    expect(buildCardData({ ...base, latinName: null }).latinName).toBeNull();
    expect(
      buildCardData({ ...base, latinName: undefined }).latinName,
    ).toBeNull();
  });
});

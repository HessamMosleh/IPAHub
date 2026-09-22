import {
  buildCardSvg,
  paletteFor,
  CARD_W,
  CARD_H,
  parseCardSide,
  cardDownloadName,
  escapeXml,
  fitFontSize,
  estimateTextWidth,
} from './membership-card-svg.util';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { CardData } from './membership-card-data.util';

describe('membership-card-svg.util', () => {
  const dummyCardData: CardData = {
    fullName: 'پروانه یزدان پناه',
    latinName: 'Parvaneh Yazdanpanah',
    nationalCodeText: '۴۴۳۳۴۴۷۶۲۵',
    membershipNoText: '۱۰۱۶',
    fieldOfStudy: 'کارشناسی ارشد روان شناسی بالینی',
    expiresAt: new Date('2027-07-30T12:00:00.000Z'),
    expiresAtText: '۱۴۰۶/۰۵/۰۸',
    membershipType: MembershipType.STUDENT,
  };

  it('escapes XML special characters', () => {
    expect(escapeXml('<script>&"\'</script>')).toBe(
      '&lt;script&gt;&amp;&quot;&apos;&lt;/script&gt;',
    );
  });

  it('estimates text width and fits font size', () => {
    const width = estimateTextWidth('Hello', 20);
    expect(width).toBeGreaterThan(0);

    const fit = fitFontSize('Short', 200, 26);
    expect(fit).toBe(26);

    const fitLong = fitFontSize(
      'A very very very very long qualification name that exceeds max width',
      100,
      26,
    );
    expect(fitLong).toBeLessThan(26);
    expect(fitLong).toBeGreaterThanOrEqual(14);
  });

  it('returns valid palette for each membership tier', () => {
    const tiers = [
      MembershipType.STUDENT,
      MembershipType.REGULAR,
      MembershipType.AFFILIATE,
      MembershipType.HONORARY,
    ];
    for (const tier of tiers) {
      const palette = paletteFor(tier);
      expect(palette).toBeDefined();
      expect(palette.bandDark).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.chipBg).toBeDefined();
      expect(palette.chipInk).toBeDefined();
    }
  });

  it('parses valid card sides and rejects invalid sides', () => {
    expect(parseCardSide('front')).toBe('front');
    expect(parseCardSide('back')).toBe('back');
    expect(parseCardSide('other')).toBeNull();
    expect(parseCardSide('')).toBeNull();
  });

  it('formats card download filenames', () => {
    expect(cardDownloadName('req-123', 'front')).toBe(
      'membership-card-req-123-front.png',
    );
    expect(cardDownloadName('req-123', 'back')).toBe(
      'membership-card-req-123-back.png',
    );
  });

  it('builds SVG for front side with correct dimensions and data', () => {
    const svg = buildCardSvg({
      side: 'front',
      data: dummyCardData,
      palette: paletteFor(dummyCardData.membershipType),
    });

    expect(svg).toContain(`width="${CARD_W}"`);
    expect(svg).toContain(`height="${CARD_H}"`);
    expect(svg).toContain('پروانه یزدان پناه');
    expect(svg).toContain('Parvaneh Yazdanpanah');
    expect(svg).toContain('۴۴۳۳۴۴۷۶۲۵');
    expect(svg).toContain('۱۰۱۶');
    expect(svg).toContain('کارشناسی ارشد روان شناسی بالینی');
    expect(svg).toContain('۱۴۰۶/۰۵/۰۸');
  });

  it('builds SVG for back side with postal code and organization info', () => {
    const svg = buildCardSvg({
      side: 'back',
      data: dummyCardData,
      palette: paletteFor(dummyCardData.membershipType),
    });

    expect(svg).toContain(`width="${CARD_W}"`);
    expect(svg).toContain(`height="${CARD_H}"`);
    expect(svg).toContain('انجمن صنفی کارفرمایی');
    expect(svg).toContain('صندوق پستی');
    expect(svg).toContain('۱۶۷۶۵-۳۱۱۴');
  });
});

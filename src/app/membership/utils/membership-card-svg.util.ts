import { MembershipType } from '../../../common/enums/membership-type.enum';
import { CardData } from './membership-card-data.util';

/**
 * Card geometry, in pixels on a 1012x638 canvas — CR80 (85.6 x 54 mm) at 300 dpi.
 */
export const CARD_W = 1012;
export const CARD_H = 638;
export const CARD_RADIUS = 40;

/** Right edge of the RTL text column on the front. */
export const TEXT_RIGHT = 640;

export const FRONT_LOGO = { x: 44, y: 34, w: 168, h: 168 };

/** Association name block, right-aligned at TEXT_RIGHT. */
export const FRONT_ORG = { fa1Y: 84, fa2Y: 130, en1Y: 176, en2Y: 208 };

/** The four label/value rows. Colons align; values extend leftward. */
export const INFO_ROWS = {
  firstY: 292,
  gap: 62,
  labelRight: TEXT_RIGHT,
  colonX: 452,
  valueRight: 436,
  valueMaxW: 400,
};

export const PHOTO_BOX = { x: 700, y: 128, w: 244, h: 320, border: 7 };

/** Name plate and type chip, centred under the photo. */
export const NAME_PLATE = {
  centerX: 822,
  faY: 506,
  latinY: 544,
  chipY: 566,
  chipW: 200,
  chipH: 44,
  chipRadius: 10,
};

export const SIGNATURE = { centerX: 200, y: 566 };

/** Centred bevelled panel on the back. */
export const BACK_PANEL = { inset: 58, bevel: 118 };
export const BACK_LOGO = { x: 396, y: 96, w: 220, h: 220 };
export const BACK_TEXT = {
  centerX: CARD_W / 2,
  fa1Y: 366,
  fa2Y: 410,
  en1Y: 456,
  en2Y: 488,
  poY: 556,
  poSize: 24,
  poGap: 32,
};

export interface CardPalette {
  bandDark: string;
  bandMid: string;
  bandLight: string;
  bandPale: string;
  panel: string;
  ink: string;
  inkSoft: string;
  chipBg: string;
  chipInk: string;
}

export const CARD_PALETTES: Record<MembershipType, CardPalette> = {
  [MembershipType.STUDENT]: {
    bandDark: '#1d4f8c',
    bandMid: '#2f74b5',
    bandLight: '#5a9bd4',
    bandPale: '#cfe2f3',
    panel: '#ffffff',
    ink: '#0f2b4a',
    inkSoft: '#3c5a78',
    chipBg: '#1d4f8c',
    chipInk: '#ffffff',
  },
  [MembershipType.REGULAR]: {
    bandDark: '#1b3a63',
    bandMid: '#2b5a8f',
    bandLight: '#4a7fb0',
    bandPale: '#d3e0ee',
    panel: '#ffffff',
    ink: '#10243d',
    inkSoft: '#39536f',
    chipBg: '#1b3a63',
    chipInk: '#ffffff',
  },
  [MembershipType.AFFILIATE]: {
    bandDark: '#14615c',
    bandMid: '#1f867e',
    bandLight: '#4fb0a5',
    bandPale: '#cfe8e4',
    panel: '#ffffff',
    ink: '#0d3330',
    inkSoft: '#356460',
    chipBg: '#14615c',
    chipInk: '#ffffff',
  },
  [MembershipType.HONORARY]: {
    bandDark: '#7a5a17',
    bandMid: '#a8801f',
    bandLight: '#cfa844',
    bandPale: '#f0e3c2',
    panel: '#ffffff',
    ink: '#3d2c07',
    inkSoft: '#6b5423',
    chipBg: '#7a5a17',
    chipInk: '#ffffff',
  },
};

export function paletteFor(type: MembershipType | string): CardPalette {
  const norm = (type ? type.toLowerCase() : 'regular') as MembershipType;
  return CARD_PALETTES[norm] || CARD_PALETTES[MembershipType.REGULAR];
}

export const CARD_LABELS = {
  nationalId: 'کد ملی',
  membershipNo: 'شماره عضویت',
  fieldOfStudy: 'رشته تحصیلی',
  expiry: 'تاریخ اعتبار',
  signature: 'مهر و امضاء',
  orgFa1: 'انجمن صنفی کارفرمایی',
  orgFa2: 'موسسان مراکز روان شناسی و مشاوره کشور',
  orgEn1: "Employers' Association of",
  orgEn2: 'Psychology and Counseling Centers',
  poBoxLabel: 'صندوق پستی',
  poBox: '۱۶۷۶۵-۳۱۱۴',
} as const;

export const TYPE_LABELS: Record<MembershipType, string> = {
  [MembershipType.REGULAR]: 'پیوسته',
  [MembershipType.AFFILIATE]: 'وابسته',
  [MembershipType.STUDENT]: 'دانشجویی',
  [MembershipType.HONORARY]: 'افتخاری',
};

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const AVG_ADVANCE = 0.46;
const MIN_FONT = 14;

export function fitFontSize(
  text: string,
  maxWidth: number,
  baseSize: number,
): number {
  const estimated = estimateTextWidth(text, baseSize);
  if (estimated <= maxWidth) return baseSize;
  return Math.max(
    MIN_FONT,
    Math.floor((maxWidth / (text.length * AVG_ADVANCE)) * 10) / 10,
  );
}

export function estimateTextWidth(text: string, size: number): number {
  return text.length * size * AVG_ADVANCE;
}

export type CardSide = 'front' | 'back';

export interface BuildCardSvgArgs {
  side: CardSide;
  data: CardData;
  palette: CardPalette;
  logoDataUri?: string | null;
  photoDataUri?: string | null;
}

interface TextOpts {
  anchor?: 'start' | 'middle' | 'end';
  weight?: 400 | 700;
  fill?: string;
}

function text(
  x: number,
  y: number,
  size: number,
  content: string,
  o: TextOpts = {},
): string {
  const anchor = o.anchor ?? 'end';
  return (
    `<text x="${x}" y="${y}" font-family="Vazirmatn" font-size="${size}" font-weight="${o.weight ?? 400}" ` +
    `fill="${o.fill ?? '#000000'}" text-anchor="${anchor}" xml:space="preserve">${escapeXml(content)}</text>`
  );
}

function bands(p: CardPalette): string {
  return [
    `<polygon points="${CARD_W},0 ${CARD_W},${CARD_H} 470,${CARD_H}" fill="${p.bandDark}"/>`,
    `<polygon points="${CARD_W},96 ${CARD_W},${CARD_H} 646,${CARD_H}" fill="${p.bandMid}"/>`,
    `<polygon points="${CARD_W},330 ${CARD_W},${CARD_H} 812,${CARD_H}" fill="${p.bandLight}"/>`,
    `<polygon points="0,${CARD_H} 250,${CARD_H} 0,${CARD_H - 130}" fill="${p.bandPale}"/>`,
  ].join('');
}

function frontBody(a: BuildCardSvgArgs): string {
  const { data: d, palette: p } = a;
  const out: string[] = [];

  out.push(
    `<polygon points="0,0 664,0 536,${CARD_H} 0,${CARD_H}" fill="${p.panel}"/>`,
  );

  if (a.logoDataUri) {
    out.push(
      `<image x="${FRONT_LOGO.x}" y="${FRONT_LOGO.y}" width="${FRONT_LOGO.w}" height="${FRONT_LOGO.h}" href="${a.logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  out.push(
    text(TEXT_RIGHT, FRONT_ORG.fa1Y, 30, CARD_LABELS.orgFa1, {
      weight: 700,
      fill: p.ink,
    }),
  );
  out.push(
    text(TEXT_RIGHT, FRONT_ORG.fa2Y, 24, CARD_LABELS.orgFa2, {
      fill: p.ink,
    }),
  );
  out.push(
    text(TEXT_RIGHT, FRONT_ORG.en1Y, 19, CARD_LABELS.orgEn1, {
      fill: p.inkSoft,
    }),
  );
  out.push(
    text(TEXT_RIGHT, FRONT_ORG.en2Y, 19, CARD_LABELS.orgEn2, {
      fill: p.inkSoft,
    }),
  );

  const rows: { label: string; value: string }[] = [
    { label: CARD_LABELS.nationalId, value: d.nationalCodeText },
    { label: CARD_LABELS.membershipNo, value: d.membershipNoText },
    ...(d.fieldOfStudy
      ? [{ label: CARD_LABELS.fieldOfStudy, value: d.fieldOfStudy }]
      : []),
    { label: CARD_LABELS.expiry, value: d.expiresAtText },
  ];

  rows.forEach((row, i) => {
    const y = INFO_ROWS.firstY + i * INFO_ROWS.gap;
    out.push(
      text(INFO_ROWS.labelRight, y, 26, row.label, {
        weight: 700,
        fill: p.ink,
      }),
    );
    out.push(
      text(INFO_ROWS.colonX, y, 26, ':', {
        anchor: 'start',
        fill: p.ink,
      }),
    );
    out.push(
      text(
        INFO_ROWS.valueRight,
        y,
        fitFontSize(row.value, INFO_ROWS.valueMaxW, 26),
        row.value,
        { fill: p.ink },
      ),
    );
  });

  out.push(
    text(SIGNATURE.centerX, SIGNATURE.y, 22, CARD_LABELS.signature, {
      anchor: 'middle',
      fill: p.inkSoft,
    }),
  );

  const b = PHOTO_BOX.border;
  out.push(
    `<rect x="${PHOTO_BOX.x - b}" y="${PHOTO_BOX.y - b}" width="${PHOTO_BOX.w + b * 2}" height="${PHOTO_BOX.h + b * 2}" fill="#ffffff"/>`,
  );
  if (a.photoDataUri) {
    out.push(
      `<image x="${PHOTO_BOX.x}" y="${PHOTO_BOX.y}" width="${PHOTO_BOX.w}" height="${PHOTO_BOX.h}" href="${a.photoDataUri}" preserveAspectRatio="xMidYMid slice"/>`,
    );
  } else {
    out.push(
      `<rect x="${PHOTO_BOX.x}" y="${PHOTO_BOX.y}" width="${PHOTO_BOX.w}" height="${PHOTO_BOX.h}" fill="${p.bandPale}"/>`,
    );
  }

  const n = NAME_PLATE;
  out.push(
    `<rect x="${n.centerX - 130}" y="${n.faY - 32}" width="260" height="${d.latinName ? 76 : 44}" fill="#ffffff" fill-opacity="0.82"/>`,
  );
  out.push(
    text(n.centerX, n.faY, fitFontSize(d.fullName, 250, 26), d.fullName, {
      anchor: 'middle',
      weight: 700,
      fill: p.ink,
    }),
  );
  if (d.latinName) {
    out.push(
      text(
        n.centerX,
        n.latinY,
        fitFontSize(d.latinName, 250, 22),
        d.latinName,
        {
          anchor: 'middle',
          weight: 700,
          fill: p.inkSoft,
        },
      ),
    );
  }
  out.push(
    `<rect x="${n.centerX - n.chipW / 2}" y="${n.chipY}" width="${n.chipW}" height="${n.chipH}" rx="${n.chipRadius}" fill="${p.chipBg}"/>`,
  );
  out.push(
    text(
      n.centerX,
      n.chipY + 31,
      24,
      TYPE_LABELS[d.membershipType] || TYPE_LABELS[MembershipType.REGULAR],
      { anchor: 'middle', weight: 700, fill: p.chipInk },
    ),
  );

  return out.join('');
}

function backBody(a: BuildCardSvgArgs): string {
  const { palette: p } = a;
  const i = BACK_PANEL.inset;
  const b = BACK_PANEL.bevel;

  const PERSIAN_SAFETY = 1.15;
  const poLabelW =
    estimateTextWidth(CARD_LABELS.poBoxLabel, BACK_TEXT.poSize) *
    PERSIAN_SAFETY;
  const poValueW = estimateTextWidth(CARD_LABELS.poBox, BACK_TEXT.poSize);
  const poColonW = 4;
  const poRight =
    BACK_TEXT.centerX +
    (poLabelW + poColonW + BACK_TEXT.poGap * 2 + poValueW) / 2;
  const poColonRight = poRight - poLabelW - BACK_TEXT.poGap;
  const poValueRight = poColonRight - poColonW - BACK_TEXT.poGap;
  const panel =
    `${i + b},${i} ${CARD_W - i - b},${i} ${CARD_W - i},${i + b} ${CARD_W - i},${CARD_H - i - b} ` +
    `${CARD_W - i - b},${CARD_H - i} ${i + b},${CARD_H - i} ${i},${CARD_H - i - b} ${i},${i + b}`;

  return [
    `<polygon points="${panel}" fill="${p.panel}"/>`,
    ...(a.logoDataUri
      ? [
          `<image x="${BACK_LOGO.x}" y="${BACK_LOGO.y}" width="${BACK_LOGO.w}" height="${BACK_LOGO.h}" href="${a.logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`,
        ]
      : []),
    text(BACK_TEXT.centerX, BACK_TEXT.fa1Y, 32, CARD_LABELS.orgFa1, {
      anchor: 'middle',
      weight: 700,
      fill: p.ink,
    }),
    text(BACK_TEXT.centerX, BACK_TEXT.fa2Y, 26, CARD_LABELS.orgFa2, {
      anchor: 'middle',
      fill: p.ink,
    }),
    text(BACK_TEXT.centerX, BACK_TEXT.en1Y, 21, CARD_LABELS.orgEn1, {
      anchor: 'middle',
      fill: p.inkSoft,
    }),
    text(BACK_TEXT.centerX, BACK_TEXT.en2Y, 21, CARD_LABELS.orgEn2, {
      anchor: 'middle',
      fill: p.inkSoft,
    }),
    text(poRight, BACK_TEXT.poY, BACK_TEXT.poSize, CARD_LABELS.poBoxLabel, {
      fill: p.ink,
    }),
    text(poColonRight, BACK_TEXT.poY, BACK_TEXT.poSize, ':', { fill: p.ink }),
    text(poValueRight, BACK_TEXT.poY, BACK_TEXT.poSize, CARD_LABELS.poBox, {
      fill: p.ink,
    }),
  ].join('');
}

export function buildCardSvg(args: BuildCardSvgArgs): string {
  const body = args.side === 'front' ? frontBody(args) : backBody(args);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<defs><clipPath id="card"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="${CARD_RADIUS}" ry="${CARD_RADIUS}"/></clipPath></defs>` +
    `<g clip-path="url(#card)">` +
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${args.palette.panel}"/>` +
    bands(args.palette) +
    body +
    `</g></svg>`
  );
}

export function parseCardSide(value: string): CardSide | null {
  return value === 'front' || value === 'back' ? value : null;
}

export function cardDownloadName(requestId: string, side: CardSide): string {
  return `membership-card-${requestId}-${side}.png`;
}

import { MembershipType } from '../../../common/enums/membership-type.enum';

/**
 * A province's override of one tier's fees, in the shape the pricing math needs.
 * `province` is compared as a string so a Mongoose `ObjectId` and a plain id are
 * interchangeable; `entranceFee` is `null`/`undefined` when the province row was
 * created for an annual override alone and does NOT override the entrance fee.
 */
export interface ProvincePriceInput {
  province: unknown;
  fee: number;
  entranceFee?: number | null;
}

/** One tier's fee table, in the shape the pricing math needs. */
export interface FeeRowInput {
  type: MembershipType;
  baseFee: number;
  entranceFee: number;
  prices: ProvincePriceInput[];
}

/** The itemised result of quoting a tier for a member. */
export interface MembershipQuote {
  fee: number;
  creditType: MembershipType | null;
  creditApplied: number;
  entranceFee: number;
  amountDue: number;
}

/** Normalises any id-like value (ObjectId, string, populated doc) to a string. */
export function idToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  const candidate = value as {
    toHexString?: () => string;
    _id?: unknown;
  };
  if (typeof candidate.toHexString === 'function') {
    return candidate.toHexString();
  }
  if (candidate._id !== undefined && candidate._id !== value) {
    return idToString(candidate._id);
  }
  return '';
}

/**
 * The annual fee for a tier in a province: the province override when one exists,
 * otherwise the national base fee. A missing fee row reads as `0`, so a
 * half-seeded database keeps membership free rather than throwing.
 */
export function priceFor(
  rows: FeeRowInput[],
  type: MembershipType,
  provinceId: string | null | undefined,
): number {
  const row = rows.find((r) => r.type === type);
  if (!row) return 0;
  return resolveAnnualFee(row, provinceId);
}

/** The annual fee for one already-resolved fee row in a province. */
export function resolveAnnualFee(
  row: FeeRowInput,
  provinceId: string | null | undefined,
): number {
  if (provinceId) {
    const override = row.prices.find(
      (p) => idToString(p.province) === provinceId,
    );
    if (override) return override.fee;
  }
  return row.baseFee;
}

/**
 * The one-time entrance fee for a row in a province. A province override applies
 * ONLY when its `entranceFee` is non-null: a province row that exists purely to
 * override the annual fee must not silently price the entrance fee at zero.
 */
export function resolveEntranceFee(
  row: FeeRowInput,
  provinceId: string | null | undefined,
): number {
  if (provinceId) {
    const override = row.prices.find(
      (p) => idToString(p.province) === provinceId,
    );
    if (override && override.entranceFee != null) {
      return override.entranceFee;
    }
  }
  return row.entranceFee;
}

/**
 * Quotes what a member owes to hold `requestedType`.
 *
 * The credit is today's price of the tier the member currently holds, applied
 * against the new annual fee but never below zero — a downgrade is not a refund.
 * The entrance fee is added AFTER that floor (credit never absorbs a joining fee)
 * and is only owed when joining `REGULAR` for the first time.
 *
 *   amountDue = max(0, fee - creditApplied) + entranceFee
 */
export function quoteMembership(
  input: {
    provinceId: string | null;
    currentType: MembershipType | null;
    entranceSettled: boolean;
  },
  requestedType: MembershipType,
  rows: FeeRowInput[],
): MembershipQuote {
  const fee = priceFor(rows, requestedType, input.provinceId);

  const creditType = input.currentType;
  const creditApplied = creditType
    ? priceFor(rows, creditType, input.provinceId)
    : 0;

  const row = rows.find((r) => r.type === requestedType);
  const entranceFee =
    requestedType === MembershipType.REGULAR && !input.entranceSettled && row
      ? resolveEntranceFee(row, input.provinceId)
      : 0;

  return {
    fee,
    creditType,
    creditApplied,
    entranceFee,
    amountDue: Math.max(0, fee - creditApplied) + entranceFee,
  };
}

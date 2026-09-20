/**
 * Normalises any id-like value (ObjectId, string, populated document) to a string.
 */
export function idToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  const candidate = value as {
    toHexString?: () => string;
    _id?: unknown;
    toString?: () => string;
  };
  if (typeof candidate.toHexString === 'function') {
    return candidate.toHexString();
  }
  if (candidate._id !== undefined && candidate._id !== value) {
    return idToString(candidate._id);
  }
  if (typeof candidate.toString === 'function') {
    return candidate.toString();
  }
  return '';
}

export interface PricedRequestTypeInput {
  baseFee: number;
  prices?: Array<{
    province: unknown;
    fee: number;
  }>;
}

/**
 * Resolves the applicable fee for a document request type in a member's province.
 * If the member has a province and that province has an override in `prices`,
 * returns the override fee. Otherwise, returns `baseFee` (defaulting to 0).
 */
export function resolveRequestPrice(
  type: PricedRequestTypeInput,
  provinceId?: unknown,
): number {
  const normProvinceId = idToString(provinceId);
  if (normProvinceId && Array.isArray(type.prices) && type.prices.length > 0) {
    const override = type.prices.find(
      (p) => idToString(p.province) === normProvinceId,
    );
    if (override && typeof override.fee === 'number') {
      return override.fee;
    }
  }
  return typeof type.baseFee === 'number' ? type.baseFee : 0;
}

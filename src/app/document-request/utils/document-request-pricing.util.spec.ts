import { Types } from 'mongoose';
import {
  idToString,
  resolveRequestPrice,
} from './document-request-pricing.util';

describe('document-request-pricing.util', () => {
  describe('idToString', () => {
    it('returns empty string for null and undefined', () => {
      expect(idToString(null)).toBe('');
      expect(idToString(undefined)).toBe('');
    });

    it('returns string value unchanged', () => {
      expect(idToString('66fa3b5a9c1e7a001f3e9a11')).toBe(
        '66fa3b5a9c1e7a001f3e9a11',
      );
    });

    it('converts ObjectId to hex string', () => {
      const oid = new Types.ObjectId('66fa3b5a9c1e7a001f3e9a11');
      expect(idToString(oid)).toBe('66fa3b5a9c1e7a001f3e9a11');
    });

    it('extracts _id property if present on object', () => {
      const obj = { _id: '66fa3b5a9c1e7a001f3e9a11' };
      expect(idToString(obj)).toBe('66fa3b5a9c1e7a001f3e9a11');
    });
  });

  describe('resolveRequestPrice', () => {
    const tehranId = '507f1f77bcf86cd799439033';
    const farsId = '507f1f77bcf86cd799439044';

    const typeWithPrices = {
      baseFee: 500000,
      prices: [
        { province: tehranId, fee: 700000 },
        { province: new Types.ObjectId(farsId), fee: 400000 },
      ],
    };

    it('returns base fee when no province is provided', () => {
      expect(resolveRequestPrice(typeWithPrices)).toBe(500000);
      expect(resolveRequestPrice(typeWithPrices, null)).toBe(500000);
      expect(resolveRequestPrice(typeWithPrices, undefined)).toBe(500000);
    });

    it('returns province override fee when province matches string id', () => {
      expect(resolveRequestPrice(typeWithPrices, tehranId)).toBe(700000);
    });

    it('returns province override fee when province is an ObjectId', () => {
      expect(
        resolveRequestPrice(typeWithPrices, new Types.ObjectId(tehranId)),
      ).toBe(700000);
      expect(resolveRequestPrice(typeWithPrices, farsId)).toBe(400000);
    });

    it('returns province override fee when province is an object containing _id', () => {
      expect(resolveRequestPrice(typeWithPrices, { _id: tehranId })).toBe(
        700000,
      );
    });

    it('falls back to baseFee when province is not in override list', () => {
      expect(
        resolveRequestPrice(typeWithPrices, '507f1f77bcf86cd799439099'),
      ).toBe(500000);
    });

    it('handles type with no prices array', () => {
      const typeNoPrices = { baseFee: 300000 };
      expect(resolveRequestPrice(typeNoPrices, tehranId)).toBe(300000);
    });

    it('defaults to 0 when baseFee is undefined', () => {
      const typeNoFee = { baseFee: undefined as unknown as number };
      expect(resolveRequestPrice(typeNoFee)).toBe(0);
    });
  });
});

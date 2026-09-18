import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { Province } from '../../../common/schemas/province.schema';

/**
 * A province's override of one tier's fees.
 *
 * Embedded for the same reason `ProvinceRequestPrice` is: at most 32 rows, always
 * loaded together to quote a price, and meaningless without the tier.
 */
@Schema({ _id: false })
export class ProvinceMembershipPrice {
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  /** Annual fee for this province, in Rials. */
  @Prop({ type: Number })
  fee: number;

  /**
   * Per-province override of the entrance fee. Deliberately NOT defaulted to 0:
   * an entry exists as soon as a province overrides the ANNUAL fee, and a
   * defaulted zero here would silently price that province's entrance fee at
   * nothing. Absent means "no override, use the national amount".
   */
  @Prop({ type: Number })
  entranceFee?: number;
}

const ProvinceMembershipPriceSchema = SchemaFactory.createForClass(
  ProvinceMembershipPrice,
);

/**
 * What one membership tier costs. One document per `MembershipType`, seeded at
 * zero so membership stays free until an admin prices it.
 *
 * The national amount is a field on this document rather than a
 * province-less entry in `prices`, because an absent province in an array cannot
 * be constrained to appear exactly once — two conflicting "national" entries
 * would be indistinguishable from one.
 */
@Schema({ timestamps: true })
export class MembershipFee extends Document {
  @Prop({ type: String, enum: MembershipType, unique: true })
  type: MembershipType;

  /** Annual fee, in Rials. */
  @Prop({ type: Number, default: 0 })
  baseFee: number;

  /** One-time joining fee. Zero for every tier but `REGULAR`. */
  @Prop({ type: Number, default: 0 })
  entranceFee: number;

  @Prop({ type: [ProvinceMembershipPriceSchema], default: [] })
  prices: ProvinceMembershipPrice[];

  @Prop({ type: Date })
  createdAt: Date;
}

export class MembershipFeeProp {
  static general = ['type', 'baseFee', 'entranceFee', 'createdAt'];

  static admin = [...this.general, 'prices'];
}

const MembershipFeeSchema = SchemaFactory.createForClass(MembershipFee);

export { MembershipFeeSchema, ProvinceMembershipPriceSchema };

import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ActiveStatus } from '../../common/enums/active-status.enum';
import { Province } from '../../common/schemas/province.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';

/** The `slug` of the one request type that is fulfilled by the system, not by an admin. */
export const MEMBERSHIP_CARD_SLUG = 'membership-card';

/**
 * A province's override of a request type's fee.
 *
 * Embedded rather than its own collection: there are at most 32 of these per
 * type, they are always loaded with the type in order to quote a price, and they
 * die with it. One province may appear at most once — enforced on write, since a
 * Mongo unique index cannot span an array's elements within one document.
 */
@Schema({ _id: false })
export class ProvinceRequestPrice {
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  @Prop({ type: Number })
  fee: number;
}

const ProvinceRequestPriceSchema =
  SchemaFactory.createForClass(ProvinceRequestPrice);

/**
 * A kind of document a member may ask the association for — a membership card, a
 * letter of introduction, a certificate.
 *
 * Admin-editable rather than an enum, because the association adds new ones
 * without a deploy. `MEMBERSHIP_CARD_SLUG` is the one slug code keys off.
 */
@Schema({ timestamps: true })
export class RequestType extends Document {
  @Prop({ type: String, unique: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema })
  name: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  description?: LocalizedText;

  /** The national price, in Rials. Provinces may override it in `prices`. */
  @Prop({ type: Number, default: 0 })
  baseFee: number;

  @Prop({ type: [ProvinceRequestPriceSchema], default: [] })
  prices: ProvinceRequestPrice[];

  /**
   * Whether fulfilling a request of this type hands the member a file. False for
   * requests that are answered by an action rather than a document.
   */
  @Prop({ type: Boolean, default: true })
  producesDocument: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: String, enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export class RequestTypeProp {
  static general = [
    'slug',
    'name',
    'description',
    'baseFee',
    'producesDocument',
    'order',
    'createdAt',
  ];

  static client = [...this.general, 'prices'];

  static admin = [...this.general, 'status', 'prices'];
}

const RequestTypeSchema = SchemaFactory.createForClass(RequestType);

RequestTypeSchema.index({ status: 1, order: 1 });

export { RequestTypeSchema, ProvinceRequestPriceSchema };

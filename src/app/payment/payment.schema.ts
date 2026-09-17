import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MembershipType } from '../../common/enums/membership-type.enum';
import { Province } from '../../common/schemas/province.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';
import { RequestType } from '../request-type/request-type.schema';
import { User } from '../user/user.schema';

export enum PaymentMethod {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

/** Which workflow the money came from, and therefore what `source` points at. */
export enum PaymentSource {
  MEMBERSHIP = 'membership',
  REQUEST = 'request',
  EVENT = 'event',
}

export enum PaymentKind {
  PAYMENT = 'payment',
  REVERSAL = 'reversal',
}

/**
 * One settled transaction — the single source of truth for money collected.
 *
 * The `paymentStatus` fields on `MembershipRequest`, `DocumentRequest` and
 * `EventRegistration` remain the state machines. This collection records the
 * *event* of money settling, which those fields cannot date or attribute.
 *
 * Every amount, province and label here is SNAPSHOTTED rather than resolved at
 * read time: a member transferring province, or an admin editing a workshop's
 * fee, must not silently rewrite what was collected last year.
 */
@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: String, enum: PaymentKind, default: PaymentKind.PAYMENT })
  kind: PaymentKind;

  /**
   * Positive for a `PAYMENT`, negative for a `REVERSAL`, so every report is one
   * sum rather than a sum minus a sum.
   */
  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String, enum: PaymentSource })
  source: PaymentSource;

  /**
   * Id of the settled document — a `MembershipRequest`, `DocumentRequest` or
   * `EventRegistration` according to `source`. Deliberately not a `ref`: one
   * field cannot point at three collections, and populating it would need the
   * discriminator anyway.
   */
  @Prop({ type: Types.ObjectId })
  sourceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  /** The province credited, snapshotted at settlement. */
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  /**
   * Snapshotted so the request-type filter and the top-request-types report are
   * an indexed field rather than a lookup. Absent unless `source` is `REQUEST`.
   */
  @Prop({ type: Types.ObjectId, ref: RequestType.name })
  requestType: RequestType;

  /**
   * For `REQUEST` and `EVENT`: the name copied from the source at settlement
   * time, so a renamed or deleted item still reads correctly on a receipt.
   *
   * Absent for `MEMBERSHIP`, which is labelled from `membershipType` through the
   * translation catalogue rather than duplicating tier names into the database.
   */
  @Prop({ type: LocalizedTextSchema })
  description?: LocalizedText;

  @Prop({ type: String, enum: MembershipType })
  membershipType: MembershipType;

  @Prop({ type: String, enum: PaymentMethod })
  method: PaymentMethod;

  /** Bank tracking number, gateway reference, or receipt number. */
  @Prop({ type: String })
  reference: string;

  /** Absent when the member paid online; set when an admin confirmed it. */
  @Prop({ type: Types.ObjectId, ref: User.name })
  confirmedBy: User;

  @Prop({ type: Date })
  paidAt: Date;

  /**
   * True for rows created by a backfill, whose date — and for events, whose
   * amount — had to be derived rather than read. Reports that need real
   * collection dates exclude them.
   */
  @Prop({ type: Boolean, default: false })
  backfilled: boolean;

  /**
   * The payment this one reverses. Unique, so a payment cannot be reversed twice.
   * `ref` is the string `'Payment'` rather than `Payment.name` because the class
   * binding is not yet initialised while its own decorators run.
   */
  @Prop({ type: Types.ObjectId, ref: 'Payment', unique: true, sparse: true })
  reverses: Payment;

  @Prop({ type: String })
  note: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export class PaymentProp {
  static general = [
    'kind',
    'amount',
    'source',
    'sourceId',
    'description',
    'membershipType',
    'method',
    'reference',
    'paidAt',
    'createdAt',
  ];

  static admin = [
    ...this.general,
    'user',
    'province',
    'requestType',
    'confirmedBy',
    'backfilled',
    'reverses',
    'note',
  ];
}

const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ paidAt: -1 });
PaymentSchema.index({ province: 1, paidAt: -1 });
PaymentSchema.index({ source: 1, paidAt: -1 });
PaymentSchema.index({ requestType: 1 });
PaymentSchema.index({ user: 1, paidAt: -1 });
PaymentSchema.index({ source: 1, sourceId: 1 });

export { PaymentSchema };

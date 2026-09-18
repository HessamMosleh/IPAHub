import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { User } from '../../user/user.schema';

/**
 * Applications are vetted by an admin; renewals are self-serve and are born
 * already approved. The discriminator is what keeps genuine applications from
 * being buried under routine renewals in the admin list.
 */
export enum MembershipRequestKind {
  APPLICATION = 'application',
  RENEWAL = 'renewal',
}

/**
 * `AWAITING_PAYMENT` is the gap between an admin agreeing to the membership and
 * the money arriving: approved-in-principle, not yet a member.
 */
export enum MembershipRequestStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting-payment',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * One application for, or renewal of, a membership tier.
 *
 * Every amount here is a snapshot taken when the request was decided, not a live
 * lookup: a later price edit, or the member moving province, must not silently
 * move a bill that has already been issued.
 */
@Schema({ timestamps: true })
export class MembershipRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: String, enum: MembershipType })
  type: MembershipType;

  /**
   * The tier's application answers, keyed by the descriptors in
   * `MEMBERSHIP_FORM_FIELDS`. Deliberately schemaless: an application records the
   * questions asked at the time, and changing the question set must not rewrite
   * or invalidate answers already submitted under the old one.
   */
  @Prop({ type: Object, default: {} })
  formData: Record<string, string>;

  @Prop({
    type: String,
    enum: MembershipRequestKind,
    default: MembershipRequestKind.APPLICATION,
  })
  kind: MembershipRequestKind;

  @Prop({
    type: String,
    enum: MembershipRequestStatus,
    default: MembershipRequestStatus.PENDING,
  })
  status: MembershipRequestStatus;

  @Prop({ type: String })
  rejectionReason: string;

  /** The annual fee for the tier, frozen at approval. */
  @Prop({ type: Number, default: 0 })
  fee: number;

  /** The tier the credit was earned on, when the member is switching tiers. */
  @Prop({ type: String, enum: MembershipType })
  creditType: MembershipType;

  /** Unused value carried over from the member's previous tier. */
  @Prop({ type: Number, default: 0 })
  creditApplied: number;

  /** What the member actually owes: `fee + entranceFee - creditApplied`. */
  @Prop({ type: Number, default: 0 })
  amountDue: number;

  /**
   * The entrance component of this bill, snapshotted alongside the rest. Credit
   * never reduces it — it is a joining fee, not a subscription.
   */
  @Prop({ type: Number, default: 0 })
  entranceFee: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.NONE })
  paymentStatus: PaymentStatus;

  @Prop({ type: Date })
  paidAt: Date;

  /** When an admin approved or rejected it. */
  @Prop({ type: Date })
  decidedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export class MembershipRequestProp {
  static general = [
    'type',
    'formData',
    'kind',
    'status',
    'rejectionReason',
    'fee',
    'entranceFee',
    'creditType',
    'creditApplied',
    'amountDue',
    'paymentStatus',
    'paidAt',
    'decidedAt',
    'createdAt',
  ];

  static admin = [...this.general, 'user'];
}

const MembershipRequestSchema = SchemaFactory.createForClass(MembershipRequest);

MembershipRequestSchema.index({ user: 1, createdAt: -1 });
MembershipRequestSchema.index({ status: 1, kind: 1, createdAt: -1 });

export { MembershipRequestSchema };

import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Province } from '../../common/schemas/province.schema';
import { User } from '../user/user.schema';

/** The association's nine areas of cooperation. */
export enum CooperationField {
  EDUCATIONAL = 'educational',
  ADMINISTRATIVE = 'administrative',
  RESEARCH = 'research',
  LEGAL = 'legal',
  WELFARE = 'welfare',
  CONSULTING = 'consulting',
  ORGANIZATIONAL = 'organizational',
  TECHNOLOGY = 'technology',
  PUBLICATIONS = 'publications',
}

/**
 * A cooperation proposal is vetted like a membership application, but nothing is
 * bought and nothing is issued — so there is no awaiting-payment state and no
 * completion. The decision is the terminal state.
 */
export enum CooperationRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

/**
 * A member's offer to work with the association in one or more areas.
 *
 * The address block is stored here exactly as submitted, and is deliberately
 * neither read from nor written back to the member's profile: the association
 * reviews what the member sent, and a later profile edit must not rewrite what
 * was reviewed. `province` is a reference rather than frozen text because
 * provinces are stable seeded documents and admins filter by them; the other four
 * fields are free text, frozen as typed.
 */
@Schema({ timestamps: true })
export class CooperationRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  /** At least one, and each value appearing at most once. Validated on write. */
  @Prop({ type: [String], enum: CooperationField, default: [] })
  fields: CooperationField[];

  /**
   * Optional in practice: a member may name the areas they are interested in and
   * leave the detail to the conversation that follows.
   */
  @Prop({ type: String })
  description: string;

  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  @Prop({ type: String })
  city: string;

  @Prop({ type: String })
  postalAddress: string;

  @Prop({ type: String })
  postalCode: string;

  @Prop({ type: String })
  telephone: string;

  @Prop({
    type: String,
    enum: CooperationRequestStatus,
    default: CooperationRequestStatus.PENDING,
  })
  status: CooperationRequestStatus;

  @Prop({ type: String })
  rejectionReason: string;

  @Prop({ type: Date })
  decidedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export class CooperationRequestProp {
  static general = [
    'fields',
    'description',
    'province',
    'city',
    'postalAddress',
    'postalCode',
    'telephone',
    'status',
    'rejectionReason',
    'decidedAt',
    'createdAt',
  ];

  static admin = [...this.general, 'user'];
}

const CooperationRequestSchema =
  SchemaFactory.createForClass(CooperationRequest);

CooperationRequestSchema.index({ user: 1, createdAt: -1 });
CooperationRequestSchema.index({ status: 1, createdAt: -1 });

export { CooperationRequestSchema };

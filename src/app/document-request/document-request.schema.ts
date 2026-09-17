import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { RequestType } from '../request-type/request-type.schema';
import { User } from '../user/user.schema';

/**
 * `ACCEPTED` means an admin agreed to issue the document; `COMPLETED` means it
 * has been. The gap between the two is where payment happens, and where the
 * membership card is generated.
 */
export enum DocumentRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

/**
 * A member's request for a document.
 *
 * The `membership-card` type is fulfilled automatically — the card is rendered
 * and the request completed when payment settles (or, for a zero-fee card, when
 * it is accepted). Every other type is fulfilled by an admin uploading a file.
 */
@Schema({ timestamps: true })
export class DocumentRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: Types.ObjectId, ref: RequestType.name })
  requestType: RequestType;

  @Prop({
    type: String,
    enum: DocumentRequestStatus,
    default: DocumentRequestStatus.PENDING,
  })
  status: DocumentRequestStatus;

  /** Whatever the member wanted to say when asking. */
  @Prop({ type: String })
  note: string;

  /**
   * Frozen when the request is accepted, never quoted at submission: a later
   * price edit, or the member moving province, must not move a bill that has
   * already been issued.
   */
  @Prop({ type: Number, default: 0 })
  fee: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.NONE })
  paymentStatus: PaymentStatus;

  /** MinIO object key of the private file issued TO the member. */
  @Prop({ type: String })
  issuedFileKey: string;

  @Prop({ type: String })
  rejectionReason: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export class DocumentRequestProp {
  static general = [
    'requestType',
    'status',
    'note',
    'fee',
    'paymentStatus',
    'issuedFileKey',
    'rejectionReason',
    'createdAt',
  ];

  static admin = [...this.general, 'user'];
}

const DocumentRequestSchema = SchemaFactory.createForClass(DocumentRequest);

DocumentRequestSchema.index({ user: 1, createdAt: -1 });
DocumentRequestSchema.index({ status: 1, createdAt: -1 });
DocumentRequestSchema.index({ requestType: 1 });

export { DocumentRequestSchema };

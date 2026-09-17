import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';
import { Event } from './event.schema';
import { User } from '../user/user.schema';

/**
 * One member's place at one event.
 *
 * Its own collection rather than an array on the event: registrations are created
 * by members concurrently against a capacity limit, and they outnumber events by
 * orders of magnitude.
 */
@Schema({ timestamps: true })
export class EventRegistration extends Document {
  @Prop({ type: Types.ObjectId, ref: Event.name })
  event: Event;

  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.NONE })
  paymentStatus: PaymentStatus;

  /** Marked by an admin after the event, and what gates the certificate. */
  @Prop({ type: Boolean, default: false })
  attended: boolean;

  /** Private attendance certificate. */
  @Prop({ type: MediaFileSchema })
  certificate?: MediaFile;

  @Prop({ type: Date })
  createdAt: Date;
}

export class EventRegistrationProp {
  static general = [
    'event',
    'paymentStatus',
    'attended',
    'certificate',
    'createdAt',
  ];

  static admin = [...this.general, 'user'];
}

const EventRegistrationSchema = SchemaFactory.createForClass(EventRegistration);

// One place per member per event; a double submission must not take two seats.
EventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
EventRegistrationSchema.index({ user: 1, createdAt: -1 });

export { EventRegistrationSchema };

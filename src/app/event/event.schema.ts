import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ActiveStatus } from '../../common/enums/active-status.enum';
import { Province } from '../../common/schemas/province.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';

/**
 * Workshops and conferences are the same entity with separate listings: they are
 * scheduled, priced, registered for and certified identically, and only the page
 * they appear on differs.
 */
export enum EventType {
  WORKSHOP = 'workshop',
  CONFERENCE = 'conference',
}

/** A workshop or conference members may register for. */
@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ type: String, enum: EventType })
  type: EventType;

  @Prop({ type: LocalizedTextSchema })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  description: LocalizedText;

  @Prop({ type: Date })
  startsAt: Date;

  @Prop({ type: LocalizedTextSchema })
  location?: LocalizedText;

  /** Absent means unlimited, not zero. */
  @Prop({ type: Number })
  capacity?: number;

  /** In Rials. Zero means free, and a free registration never enters checkout. */
  @Prop({ type: Number, default: 0 })
  fee: number;

  /** MinIO object key for the poster. */
  @Prop({ type: String })
  posterKey: string;

  /** Absent for a national event; set when the event belongs to one branch. */
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  /** `ACTIVE` is what makes the event publicly visible and registrable. */
  @Prop({ type: String, enum: ActiveStatus, default: ActiveStatus.DISABLED })
  status: ActiveStatus;

  @Prop({ type: Date })
  createdAt: Date;
}

export class EventProp {
  static general = [
    'type',
    'title',
    'description',
    'startsAt',
    'location',
    'capacity',
    'fee',
    'posterKey',
    'province',
    'createdAt',
  ];

  static admin = [...this.general, 'status'];
}

const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ status: 1, startsAt: 1 });
EventSchema.index({ type: 1, province: 1 });

export { EventSchema };

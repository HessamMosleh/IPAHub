import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Keys the member-side machinery reads by name. */
export enum MemberSettingKey {
  /** The last membership number handed out. Incremented, never reused. */
  MEMBERSHIP_NO_SEQUENCE = 'membershipNoSeq',
}

/**
 * Internal counters and flags for the member workflow.
 *
 * Deliberately a separate collection from `SiteSetting`: these are not editable
 * site content, and an admin settings form must not be able to reach the
 * membership-number sequence.
 */
@Schema({ timestamps: true })
export class MemberSetting extends Document {
  @Prop({ type: String, unique: true })
  key: string;

  @Prop({ type: String })
  value: string;
}

const MemberSettingSchema = SchemaFactory.createForClass(MemberSetting);

export { MemberSettingSchema };

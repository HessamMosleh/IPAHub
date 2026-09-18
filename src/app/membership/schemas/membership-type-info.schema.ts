import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../../common/schemas/localized-text.schema';

/**
 * Admin-editable, member-facing copy for one tier: what it is and what it
 * entitles the member to.
 *
 * One document per `MembershipType`, seeded idempotently so the admin page always
 * has something to edit — the same reason `MembershipFee` is a real document
 * rather than a nullable field.
 */
@Schema({ timestamps: true })
export class MembershipTypeInfo extends Document {
  @Prop({ type: String, enum: MembershipType, unique: true })
  type: MembershipType;

  /** The card's lead paragraph: who this tier is for. */
  @Prop({ type: LocalizedTextSchema })
  summary: LocalizedText;

  /** The rights list, as sanitized rich text. */
  @Prop({ type: LocalizedTextSchema })
  rights: LocalizedText;

  @Prop({ type: Date })
  createdAt: Date;
}

export class MembershipTypeInfoProp {
  static general = ['type', 'summary', 'rights', 'updatedAt'];

  static admin = [...this.general, 'createdAt'];
}

const MembershipTypeInfoSchema =
  SchemaFactory.createForClass(MembershipTypeInfo);

export { MembershipTypeInfoSchema };

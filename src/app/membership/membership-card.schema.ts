import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MembershipType } from '../../common/enums/membership-type.enum';
import { DocumentRequest } from '../document-request/document-request.schema';
import { User } from '../user/user.schema';

/**
 * A generated membership card.
 *
 * Every printed value is snapshotted here alongside the images, so the card can
 * be re-rendered identically later even after the member edits their profile —
 * a card is a document that was issued, not a live view of the holder.
 *
 * Both sides are rendered to PNG and stored in MinIO; this document holds only
 * the object keys. Card text is Persian-only and never depends on the request
 * locale.
 */
@Schema({ timestamps: true })
export class MembershipCard extends Document {
  /** The `membership-card` request this was issued for. One card per request. */
  @Prop({ type: Types.ObjectId, ref: DocumentRequest.name, unique: true })
  request: DocumentRequest;

  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  /** MinIO object key. */
  @Prop({ type: String })
  frontImageKey: string;

  /** MinIO object key. */
  @Prop({ type: String })
  backImageKey: string;

  // --- Snapshot of what was printed -----------------------------------------

  @Prop({ type: String, enum: MembershipType })
  membershipType: MembershipType;

  @Prop({ type: String })
  fullName: string;

  @Prop({ type: String })
  latinName: string;

  @Prop({ type: String })
  nationalCode: string;

  @Prop({ type: Number })
  membershipNo: number;

  /** Omitted from the card entirely when absent, rather than printed blank. */
  @Prop({ type: String })
  fieldOfStudy: string;

  @Prop({ type: Date })
  issuedAt: Date;

  @Prop({ type: Date })
  expiresAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export class MembershipCardProp {
  static general = [
    'request',
    'frontImageKey',
    'backImageKey',
    'membershipType',
    'fullName',
    'latinName',
    'nationalCode',
    'membershipNo',
    'fieldOfStudy',
    'issuedAt',
    'expiresAt',
    'createdAt',
  ];

  static admin = [...this.general, 'user'];
}

const MembershipCardSchema = SchemaFactory.createForClass(MembershipCard);

MembershipCardSchema.index({ user: 1, issuedAt: -1 });

export { MembershipCardSchema };

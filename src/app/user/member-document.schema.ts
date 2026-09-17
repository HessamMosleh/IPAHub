import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';

/**
 * All four kinds exist from the start even though membership applications only
 * demand three of them today: an unused value costs nothing, and adding one
 * later means touching every place that switches on the kind.
 */
export enum MemberDocumentKind {
  EDUCATION_CERTIFICATE = 'education-certificate',
  ACTIVITY_LICENSE = 'activity-license',
  WORKPLACE_CERTIFICATE = 'workplace-certificate',
  STUDENT_CARD = 'student-card',
}

/**
 * A file supplied BY a member, as opposed to `DocumentRequest.issuedFileKey`,
 * which is issued TO them by an admin.
 *
 * The bytes live in MinIO under a private object key; this row is the metadata
 * and, crucially, the ownership record that every serve route checks before
 * streaming anything.
 */
@Schema({ timestamps: true })
export class MemberDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: String, enum: MemberDocumentKind })
  kind: MemberDocumentKind;

  /**
   * MinIO object key — also the `key` of the matching `Upload` row. Unique so
   * one key can never be claimed by two rows: deleting one would otherwise drop
   * bytes the other still points at.
   */
  @Prop({ type: String, unique: true })
  storageKey: string;

  /** The name the member's file had, used as the download filename. */
  @Prop({ type: String })
  filename: string;

  @Prop({ type: String })
  mimeType: string;

  /** Bytes. */
  @Prop({ type: Number })
  size: number;

  @Prop({ type: Date })
  createdAt: Date;
}

export class MemberDocumentProp {
  static general = ['kind', 'filename', 'mimeType', 'size', 'createdAt'];

  static admin = [...this.general, 'user', 'storageKey'];
}

const MemberDocumentSchema = SchemaFactory.createForClass(MemberDocument);

MemberDocumentSchema.index({ user: 1, kind: 1 });

export { MemberDocumentSchema };

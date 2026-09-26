import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum MediaUploadStatus {
  /** Uploaded through `POST /storage/upload`, not yet embedded in a document. */
  PENDING = 'PENDING',
  /** Embedded in a document; the owner's lifecycle now governs the object. */
  ATTACHED = 'ATTACHED',
}

/**
 * Ledger row for one object uploaded through `POST /storage/upload`.
 *
 * The client uploads first and embeds the returned key in a later create or
 * update request, so the two can drift apart: the second request may fail, be
 * abandoned, or pick a different file. Rows still `PENDING` after the grace
 * period are swept together with their MinIO object.
 *
 * Objects written server-side (member photos, member documents, membership
 * cards) never get a row, so the sweeper cannot touch them.
 */
@Schema({ timestamps: true })
export class MediaUpload extends Document {
  @Prop({ type: String, required: true, unique: true })
  key: string;

  @Prop({
    type: String,
    enum: MediaUploadStatus,
    default: MediaUploadStatus.PENDING,
  })
  status: MediaUploadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  /** Grace period for `PENDING` rows runs from here, so a reverted claim gets a fresh one. */
  @Prop({ type: Date })
  updatedAt: Date;
}

const MediaUploadSchema = SchemaFactory.createForClass(MediaUpload);

MediaUploadSchema.index({ status: 1, updatedAt: 1 });

export { MediaUploadSchema };

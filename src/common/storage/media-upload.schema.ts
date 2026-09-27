import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum MediaUploadStatus {
  /** Stored in MinIO, not yet embedded in a document. */
  PENDING = 'PENDING',
  /** Embedded in a document; the owner's lifecycle now governs the object. */
  ATTACHED = 'ATTACHED',
}

/**
 * Ledger row for one user-supplied object, written by `MediaService.upload`
 * for every upload endpoint (`POST /storage/upload`, member photo, member
 * documents).
 *
 * Storing the object and saving the document that embeds it are separate
 * steps, so the two can drift apart: the save may fail, be abandoned, or pick
 * a different file. Rows still `PENDING` after the grace period are swept
 * together with their MinIO object.
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

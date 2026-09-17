import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../user/user.schema';

/**
 * Who may read the object.
 *
 * `PUBLIC` objects are streamed by key to anyone; `PRIVATE` ones only through a
 * route that has checked the requester owns the resource pointing at them. Every
 * read and delete filters on this, so a private key handed to the public route
 * misses rather than leaking.
 */
export enum UploadVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/**
 * The registry of every object in MinIO.
 *
 * The bytes are in the bucket; this collection is what makes them accountable —
 * what an object is, who uploaded it, and whether it may be served publicly.
 * Content documents (news covers, person portraits, issued documents) store a
 * `key` that matches one of these.
 *
 * `key` is validated as a bare object name on write, because it is interpolated
 * into URLs and into download filenames.
 */
@Schema({ timestamps: true })
export class Upload extends Document {
  /** MinIO object name, unique across every bucket this app writes to. */
  @Prop({ type: String, unique: true })
  key: string;

  /** The bucket the object lives in, so a bucket rename is a data migration. */
  @Prop({ type: String })
  bucket: string;

  @Prop({ type: String, enum: UploadVisibility })
  visibility: UploadVisibility;

  @Prop({ type: String })
  mimeType: string;

  /** Bytes. */
  @Prop({ type: Number })
  size: number;

  /** The name the file had when it was uploaded, used as the download filename. */
  @Prop({ type: String })
  originalName: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  uploadedBy: User;

  @Prop({ type: Date })
  createdAt: Date;
}

export class UploadProp {
  static general = ['key', 'mimeType', 'size', 'originalName', 'createdAt'];

  static admin = [...this.general, 'bucket', 'visibility', 'uploadedBy'];
}

const UploadSchema = SchemaFactory.createForClass(Upload);

UploadSchema.index({ visibility: 1, createdAt: -1 });

export { UploadSchema };

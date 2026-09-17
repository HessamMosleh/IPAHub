import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Metadata for one object in MinIO, embedded on the document that owns it.
 *
 * The bytes live in the bucket under `key`; this subdocument is what travels
 * with the parent so a news cover, portrait or issued PDF never needs a
 * separate `Upload` collection to describe itself.
 *
 * `width` / `height` are optional and only meaningful for images (member
 * photos, gallery slides). File downloads leave them unset.
 */
@Schema({ _id: false })
export class MediaFile {
  /** MinIO object name. Validated as a bare key on write. */
  @Prop({ type: String })
  key: string;

  @Prop({ type: String })
  mimeType?: string;

  /** Bytes. */
  @Prop({ type: Number })
  size?: number;

  /** Original filename, used as the download name. */
  @Prop({ type: String })
  originalName?: string;

  @Prop({ type: Number })
  width?: number;

  @Prop({ type: Number })
  height?: number;

  @Prop({ type: Date })
  uploadedAt?: Date;
}

const MediaFileSchema = SchemaFactory.createForClass(MediaFile);

export { MediaFileSchema };

import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ActiveStatus } from '../../common/enums/active-status.enum';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';

/** One slide in the home-page gallery. */
@Schema({ timestamps: true })
export class GalleryImage extends Document {
  @Prop({ type: MediaFileSchema })
  image: MediaFile;

  /** Optional: a photograph may speak for itself. */
  @Prop({ type: LocalizedTextSchema })
  caption?: LocalizedText;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: String, enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @Prop({ type: Date })
  createdAt: Date;
}

export class GalleryImageProp {
  static general = ['image', 'caption', 'order', 'createdAt'];

  static admin = [...this.general, 'status'];
}

const GalleryImageSchema = SchemaFactory.createForClass(GalleryImage);

GalleryImageSchema.index({ status: 1, order: 1 });

export { GalleryImageSchema };

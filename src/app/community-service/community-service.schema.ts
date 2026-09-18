import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';

/** One of the services the association offers the public, listed on the home page. */
@Schema({ timestamps: true })
export class CommunityService extends Document {
  @Prop({ type: LocalizedTextSchema })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  description: LocalizedText;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export class CommunityServiceProp {
  static general = ['title', 'description', 'order', 'createdAt', 'updatedAt'];

  static admin = [...this.general];
}

const CommunityServiceSchema = SchemaFactory.createForClass(CommunityService);

CommunityServiceSchema.index({ order: 1 });

export { CommunityServiceSchema };

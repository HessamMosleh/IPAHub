import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Province } from '../../common/schemas/province.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';
import { User } from '../user/user.schema';

/**
 * `ACTIVE` is what makes a post publicly visible — there is no separate
 * `published` flag. `REGISTERING` is a draft, `DELETED` the soft-delete
 * tombstone every public read filters out.
 */
export enum NewsStatus {
  REGISTERING = 'registering',
  ACTIVE = 'active',
  DELETED = 'deleted',
}

/**
 * National news is shown everywhere; provincial news belongs to the `province`
 * it names and surfaces on that province's page.
 */
export enum NewsCategory {
  NATIONAL = 'national',
  PROVINCIAL = 'provincial',
}

@Schema({ timestamps: true })
export class News extends Document {
  @Prop({ type: LocalizedTextSchema })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  subTitle: LocalizedText;

  /** The article body: sanitized rich text, sanitized on write, not on render. */
  @Prop({ type: LocalizedTextSchema })
  content: LocalizedText;

  /** Teaser shown in listings and on the home page. */
  @Prop({ type: LocalizedTextSchema })
  summery: LocalizedText;

  /** Cover image. */
  @Prop({ type: MediaFileSchema })
  image?: MediaFile;

  @Prop({ type: String, enum: NewsCategory, default: NewsCategory.NATIONAL })
  category: NewsCategory;

  /** Set only when `category` is `PROVINCIAL`. */
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  @Prop({ type: String, enum: NewsStatus, default: NewsStatus.REGISTERING })
  status: NewsStatus;

  /** The admin who entered the post. Distinct from the printed `byline`. */
  @Prop({ type: Types.ObjectId, ref: User.name })
  author: User;

  /**
   * Free-text byline, e.g. a correspondent who is not a user of this system.
   * Optional: posts without one are attributed to the association.
   */
  @Prop({ type: LocalizedTextSchema })
  byline?: LocalizedText;

  /**
   * The publication date as readers see it. Admin-editable and deliberately
   * separate from `createdAt`, so a post about last week's event can be dated
   * to the event rather than to the evening someone got round to typing it up.
   */
  @Prop({ type: Date })
  publishedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export class NewsProp {
  static general = [
    'title',
    'subTitle',
    'content',
    'summery',
    'image',
    'category',
    'author',
    'byline',
    'province',
    'publishedAt',
    'createdAt',
  ];

  static admin = [...this.general, 'status'];
}

const NewsSchema = SchemaFactory.createForClass(News);

NewsSchema.index({ status: 1, publishedAt: -1 });
NewsSchema.index({ category: 1, province: 1 });

export { NewsSchema };

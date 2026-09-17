import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';

/**
 * The static pages an admin may edit. A closed set, because each one is linked
 * from the site navigation: a page whose key is not here has no route, and a
 * route whose key has no row renders nothing.
 */
export enum PageKey {
  ABOUT_FORUM = 'about-forum',
  FORUM_STRUCTURE = 'forum-structure',
  GOALS = 'goals',
  MEMBERSHIP = 'membership',
  MEMBERSHIP_GUIDE = 'membership-guide',
  MEMORANDUM = 'memorandum',
}

/**
 * One editable static page. Created by the seed, never by an admin — the
 * content is editable but the set of pages is not.
 */
@Schema({ timestamps: true })
export class Page extends Document {
  @Prop({ type: String, enum: PageKey, unique: true })
  key: PageKey;

  @Prop({ type: LocalizedTextSchema })
  title: LocalizedText;

  /** Sanitized rich text; may embed an Aparat video marker. */
  @Prop({ type: LocalizedTextSchema })
  body: LocalizedText;

  /** Header image. */
  @Prop({ type: MediaFileSchema })
  image?: MediaFile;

  @Prop({ type: Date })
  createdAt: Date;
}

export class PageProp {
  static general = ['key', 'title', 'body', 'image', 'updatedAt'];

  static admin = [...this.general, 'createdAt'];
}

const PageSchema = SchemaFactory.createForClass(Page);

export { PageSchema };

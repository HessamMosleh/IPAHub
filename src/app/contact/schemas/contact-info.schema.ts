import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../../common/schemas/localized-text.schema';
import {
  SocialLinks,
  SocialLinksSchema,
} from '../../../common/schemas/social-links.schema';

/** The `key` of the one document this collection is expected to hold. */
export const MAIN_CONTACT_INFO_KEY = 'main';

/**
 * How to reach the association: a single seeded document, edited but never
 * created by an admin.
 *
 * Keyed rather than found by "the only document there is", so a read can be an
 * indexed lookup and a stray second document cannot silently win.
 */
@Schema({ timestamps: true })
export class ContactInfo extends Document {
  @Prop({ type: String, unique: true, default: MAIN_CONTACT_INFO_KEY })
  key: string;

  @Prop({ type: LocalizedTextSchema })
  address: LocalizedText;

  /** Rendered inside a left-to-right wrapper regardless of page direction. */
  @Prop({ type: String })
  phone: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: SocialLinksSchema })
  socials?: SocialLinks;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export class ContactInfoProp {
  static general = [
    'address',
    'phone',
    'email',
    'socials',
    'createdAt',
    'updatedAt',
  ];

  static admin = [...this.general, 'key'];
}

const ContactInfoSchema = SchemaFactory.createForClass(ContactInfo);

export { ContactInfoSchema };

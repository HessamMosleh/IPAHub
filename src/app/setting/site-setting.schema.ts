import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * The site-wide settings an admin may edit. A closed set, because each key is read
 * by name somewhere in the app — a key not listed here is read by nothing.
 */
export enum SiteSettingKey {
  ASSOCIATION_NAME = 'associationName',
  LOGO_KEY = 'logoKey',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
}

/**
 * One site-wide setting, as a key/value pair.
 *
 * A collection of pairs rather than one settings document, so adding a setting is
 * an upsert rather than a schema change, and two admins editing different
 * settings cannot overwrite each other.
 */
@Schema({ timestamps: true })
export class SiteSetting extends Document {
  @Prop({ type: String, unique: true })
  key: string;

  /** Always a string. Callers that need a number or a flag parse it themselves. */
  @Prop({ type: String })
  value: string;
}

const SiteSettingSchema = SchemaFactory.createForClass(SiteSetting);

export { SiteSettingSchema };

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActiveStatus } from '../enums/active-status.enum';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema';
import { SocialLinks, SocialLinksSchema } from './social-links.schema';

@Schema({ timestamps: true })
export class Province extends Document {
  /**
   * Stable identifier used in URLs and by code that keys off a specific
   * province (the interactive map's shape data, the seed list). Never
   * regenerated from `name` — renaming a province must not break its links.
   *
   * Tehran is deliberately two rows, `tehran-city` and `tehran-province`,
   * which share one real-world region but are administered separately.
   */
  @Prop({ type: String, unique: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema })
  name: LocalizedText;

  /** Display order in pickers and province listings; ties fall back to slug. */
  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: SocialLinksSchema })
  socials?: SocialLinks;

  /**
   * This province's own contact details, shown on its public page. All three
   * are optional and independent: a province may publish a phone and nothing
   * else, and most rows have none of them.
   *
   * Split the way ContactInfo splits the national ones: the address is
   * bilingual content, while phone and email are plain scalars.
   */
  @Prop({ type: LocalizedTextSchema })
  contactAddress?: LocalizedText;

  @Prop({ type: String })
  contactPhone?: string;

  @Prop({ type: String })
  contactEmail?: string;

  @Prop({ type: String, enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @Prop({ type: Date })
  createdAt: Date;
}

export class ProvinceProp {
  static general = [
    'slug',
    'name',
    'order',
    'socials',
    'contactAddress',
    'contactPhone',
    'contactEmail',
    'createdAt',
  ];

  static admin = [...this.general, 'status'];
}

const ProvinceSchema = SchemaFactory.createForClass(Province);

ProvinceSchema.index({ order: 1, slug: 1 });

export { ProvinceSchema };

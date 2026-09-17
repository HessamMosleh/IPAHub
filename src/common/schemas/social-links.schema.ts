import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * The networks the association publishes links to, in the order they render.
 *
 * A fixed set of named fields rather than a free-form map: the same four links
 * appear in the site footer, the public contact page and every province page,
 * and naming them here is what stops a fifth network from having to be
 * remembered in four places.
 *
 * Every value is a full `http(s)` URL. WhatsApp is stored as a `wa.me` link
 * even when an admin typed a phone number — normalising that is the writer's
 * job, so nothing downstream has to guess whether a value is a URL.
 */
@Schema({ _id: false })
export class SocialLinks {
  @Prop({ type: String })
  facebook?: string;

  @Prop({ type: String })
  instagram?: string;

  @Prop({ type: String })
  telegram?: string;

  @Prop({ type: String })
  whatsapp?: string;
}

const SocialLinksSchema = SchemaFactory.createForClass(SocialLinks);

export { SocialLinksSchema };

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * One piece of user-editable content in every language the site publishes.
 *
 * Embedded as a subdocument on the owning document rather than kept in a
 * separate translations collection, and rather than one document per language:
 * a news post is one post whichever language you read it in, so its province,
 * author and publication state must not be able to disagree between locales.
 *
 * `en` is the fallback language — a reader asking for `fa` gets `en` when the
 * Persian text is missing, so a document with no `en` renders as nothing at
 * all. Requiredness is enforced in the DTOs, as everywhere else in this repo,
 * not by the schema.
 */
@Schema({ _id: false })
export class LocalizedText {
  @Prop({ type: String })
  en: string;

  @Prop({ type: String })
  fa?: string;
}

const LocalizedTextSchema = SchemaFactory.createForClass(LocalizedText);

export { LocalizedTextSchema };

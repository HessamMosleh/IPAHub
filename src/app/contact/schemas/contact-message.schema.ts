import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * A message from the public contact form.
 *
 * Carries its own name and email because the sender has no account — that is what
 * separates it from `MemberFeedback`.
 */
@Schema({ timestamps: true })
export class ContactMessage extends Document {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export class ContactMessageProp {
  static general = ['name', 'email', 'message', 'createdAt', 'updatedAt'];

  static admin = [...this.general, 'read'];
}

const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);

ContactMessageSchema.index({ read: 1, createdAt: -1 });

export { ContactMessageSchema };

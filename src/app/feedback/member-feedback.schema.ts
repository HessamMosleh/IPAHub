import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../user/user.schema';

/**
 * A message from a member to the association, raised from the member portal.
 *
 * Distinct from `ContactMessage`, which comes from the public form and carries a
 * name and email because its sender has no account.
 */
@Schema({ timestamps: true })
export class MemberFeedback extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: String })
  subject: string;

  @Prop({ type: String })
  body: string;

  @Prop({ type: Boolean, default: false })
  resolved: boolean;

  @Prop({ type: Date })
  createdAt: Date;
}

export class MemberFeedbackProp {
  static general = ['subject', 'body', 'resolved', 'createdAt'];

  static admin = [...this.general, 'user'];
}

const MemberFeedbackSchema = SchemaFactory.createForClass(MemberFeedback);

MemberFeedbackSchema.index({ resolved: 1, createdAt: -1 });
MemberFeedbackSchema.index({ user: 1, createdAt: -1 });

export { MemberFeedbackSchema };

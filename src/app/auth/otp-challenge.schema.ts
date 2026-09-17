import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** What the code was sent for. A login code must not complete a registration. */
export enum OtpPurpose {
  REGISTER = 'register',
  LOGIN = 'login',
}

/**
 * One issued one-time code.
 *
 * Persisted rather than held in the cache so the limits survive a restart: an
 * in-memory store lets an attacker reset `attempts` by waiting for a deploy,
 * and lets a code outlive the row that was meant to expire it.
 *
 * The code itself is never stored — only `codeHash` — for the same reason
 * passwords are not: the collection is readable by anything that can read the
 * database, and a readable code is a bypass of the SMS channel entirely.
 */
@Schema({ timestamps: true })
export class OtpChallenge extends Document {
  @Prop({ type: String })
  mobile: string;

  @Prop({ type: String })
  codeHash: string;

  @Prop({ type: String, enum: OtpPurpose })
  purpose: OtpPurpose;

  /** Failed verifications so far. The challenge is dead past the attempt cap. */
  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date })
  expiresAt: Date;

  /** Set the moment the code is accepted, so it cannot be replayed. */
  @Prop({ type: Date })
  consumedAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);

OtpChallengeSchema.index({ mobile: 1, purpose: 1, createdAt: -1 });

export { OtpChallengeSchema };

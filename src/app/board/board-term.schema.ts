import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Person } from '../person/person.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';

/**
 * Positions on the board of directors, in display order.
 *
 * A member's position belongs to the term, not to the person: the same human
 * can chair one term and sit as a plain member in the next.
 */
export enum BoardPosition {
  CHAIRMAN = 'chairman',
  VICE_CHAIRMAN = 'vice-chairman',
  SECRETARY = 'secretary',
  TREASURER = 'treasurer',
  MEMBER = 'member',
  ALTERNATE = 'alternate',
}

/**
 * Positions exactly one person may hold within a given term. The remaining two
 * — `MEMBER` and `ALTERNATE` — are held by several people at once, which is why
 * this is an allowlist of the singletons rather than a flag on each value.
 */
export const SINGLETON_BOARD_POSITIONS: readonly BoardPosition[] = [
  BoardPosition.CHAIRMAN,
  BoardPosition.VICE_CHAIRMAN,
  BoardPosition.SECRETARY,
  BoardPosition.TREASURER,
];

/**
 * One person's seat on the board for one term.
 *
 * Embedded on the term rather than kept in its own collection: a board is a
 * dozen people, always read as a whole, and a seat cannot outlive its term. The
 * pair (`term`, `person`) must stay unique — enforced on write, since a Mongo
 * unique index cannot span an array's elements within one document.
 */
@Schema({ _id: true })
export class BoardMembership {
  @Prop({ type: Types.ObjectId, ref: Person.name })
  person: Person;

  @Prop({ type: String, enum: BoardPosition })
  position: BoardPosition;

  @Prop({ type: Number, default: 0 })
  order: number;
}

const BoardMembershipSchema = SchemaFactory.createForClass(BoardMembership);

/**
 * One period of the board of directors.
 *
 * Members and their positions change between periods, so the board is a history
 * of terms rather than a flat list of people — which is what lets the public
 * site show a past board correctly instead of the current one under an old date.
 */
@Schema({ timestamps: true })
export class BoardTerm extends Document {
  @Prop({ type: LocalizedTextSchema })
  name: LocalizedText;

  /**
   * Term number. The highest `order` is the CURRENT term, and it is the value a
   * `?term=N` query carries — hence unique.
   *
   * Deliberately not derived from `endsAt`: an admin may set the current term's
   * end date in advance, which would otherwise leave the site with no current
   * board.
   */
  @Prop({ type: Number, unique: true })
  order: number;

  @Prop({ type: Date })
  startsAt: Date;

  /** Null while the term is open-ended. Display only; never decides "current". */
  @Prop({ type: Date })
  endsAt: Date;

  @Prop({ type: [BoardMembershipSchema], default: [] })
  members: BoardMembership[];

  @Prop({ type: Date })
  createdAt: Date;
}

export class BoardTermProp {
  static general = ['name', 'order', 'startsAt', 'endsAt', 'members'];

  static admin = [...this.general, 'createdAt'];
}

const BoardTermSchema = SchemaFactory.createForClass(BoardTerm);

BoardTermSchema.index({ 'members.person': 1 });

export { BoardTermSchema, BoardMembershipSchema };

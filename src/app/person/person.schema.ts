import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ActiveStatus } from '../../common/enums/active-status.enum';
import { Province } from '../../common/schemas/province.schema';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../common/schemas/localized-text.schema';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';

/**
 * Which part of the organisation a person is listed under. One role per person:
 * the public site has one page per role, and a person appears on exactly one.
 *
 * NOTE: the English labels for two of these are intentionally inverted with
 * respect to the enum names, to match the (correct) Persian — `DEPUTY` renders
 * as "Vice President" (نائب رئیس, the single second-in-command) and
 * `VICE_PRESIDENT` renders as "Deputies" (معاون, the group of area deputies).
 * Do not "fix" the names; fix the labels if they ever look wrong.
 */
export enum PersonRole {
  BOARD = 'board',
  FOUNDING_BOARD = 'founding-board',
  INSPECTOR = 'inspector',
  TREASURY = 'treasury',
  PRESIDENT = 'president',
  SECRETARY = 'secretary',
  DEPUTY = 'deputy',
  VICE_PRESIDENT = 'vice-president',
  PROVINCE_OFFICIAL = 'province-official',
  CONSULTANT = 'consultant',
}

/**
 * The areas an area deputy (`VICE_PRESIDENT`) may head. One of the two
 * vocabularies `subRole` draws from.
 */
export enum VicePresidentSubRole {
  EDUCATION = 'education',
  RESEARCH = 'research',
  PUBLIC_RELATIONS = 'public-relations',
  ADVERTISING = 'advertising',
  LEGAL_AFFAIRS = 'legal-affairs',
  WELFARE = 'welfare',
  SYSTEM_DESIGN = 'system-design',
  CONFERENCES = 'conferences',
}

/**
 * The offices in a provincial branch, in display order. The other vocabulary
 * `subRole` draws from, used when the role is `PROVINCE_OFFICIAL`.
 */
export enum ProvincePosition {
  DIRECTOR = 'director',
  DEPUTY_DIRECTOR = 'deputy-director',
  SECRETARY = 'secretary',
  PUBLIC_RELATIONS = 'public-relations',
  ADVERTISING = 'advertising',
  CONFERENCES = 'conferences',
}

/**
 * Roles that store a free-text `positionTitle`.
 *
 * The test is whether the role name alone identifies the office. It does for a
 * president, secretary or treasurer — there is exactly one, and a title would
 * only restate the role. It does not for a province official, a consultant or
 * an inspector, whose members hold distinct offices (بازرس اصلی vs
 * بازرس علی‌البدل) that the role cannot convey.
 *
 * `BOARD` is deliberately absent: a board member's position depends on the
 * term, so it lives on their `BoardMembership` instead. Storing it here too is
 * what let the admin panel and the public site disagree.
 */
export const ROLES_WITH_POSITION_TITLE: readonly PersonRole[] = [
  PersonRole.PROVINCE_OFFICIAL,
  PersonRole.CONSULTANT,
  PersonRole.INSPECTOR,
];

/** Roles that store a `subRole`, and which vocabulary it comes from. */
export const ROLES_WITH_SUB_ROLE: readonly PersonRole[] = [
  PersonRole.VICE_PRESIDENT,
  PersonRole.PROVINCE_OFFICIAL,
];

/** Only a province official belongs to a province. */
export const ROLES_WITH_PROVINCE: readonly PersonRole[] = [
  PersonRole.PROVINCE_OFFICIAL,
];

/**
 * A professional licence or certificate shown on a person's public profile.
 *
 * Embedded rather than its own collection: a licence has no life outside the
 * person holding it, is never queried on its own, and is deleted with them.
 */
@Schema({ _id: true })
export class PersonLicense {
  @Prop({ type: LocalizedTextSchema })
  title: LocalizedText;

  /** Scanned licence image. */
  @Prop({ type: MediaFileSchema })
  image: MediaFile;

  @Prop({ type: Date })
  createdAt: Date;
}

const PersonLicenseSchema = SchemaFactory.createForClass(PersonLicense);

/**
 * Someone the association lists publicly: a board member, an inspector, the
 * president, a provincial official, a consultant.
 *
 * Deliberately separate from `User`: being listed on the site is not the same
 * thing as having an account, and most of the people here have never logged in.
 */
@Schema({ timestamps: true })
export class Person extends Document {
  @Prop({ type: LocalizedTextSchema })
  name: LocalizedText;

  /** Portrait photo. */
  @Prop({ type: MediaFileSchema })
  photo?: MediaFile;

  @Prop({ type: String, enum: PersonRole })
  role: PersonRole;

  /**
   * A `VicePresidentSubRole` or a `ProvincePosition`, depending on `role` — see
   * `ROLES_WITH_SUB_ROLE`. Untyped here because it draws from two vocabularies;
   * which one applies is decided by the role, and validated on write.
   */
  @Prop({ type: String })
  subRole?: string;

  /** Free-text office name. Stored only for `ROLES_WITH_POSITION_TITLE`. */
  @Prop({ type: LocalizedTextSchema })
  positionTitle?: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  about?: LocalizedText;

  /** Sanitized rich text. */
  @Prop({ type: LocalizedTextSchema })
  resume?: LocalizedText;

  /** Uploaded CV file. */
  @Prop({ type: MediaFileSchema })
  resumeFile?: MediaFile;

  /**
   * A YouTube or Aparat URL, not an embed. Rendered behind a click-to-play
   * facade so nothing loads from the platform until a reader asks for it.
   */
  @Prop({ type: String })
  introVideoUrl?: string;

  @Prop({ type: LocalizedTextSchema })
  contact?: LocalizedText;

  /** Set only when `role` is `PROVINCE_OFFICIAL`. */
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province?: Province;

  @Prop({ type: [PersonLicenseSchema], default: [] })
  licenses: PersonLicense[];

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: String, enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @Prop({ type: Date })
  createdAt: Date;
}

export class PersonProp {
  static general = [
    'name',
    'photo',
    'role',
    'subRole',
    'positionTitle',
    'about',
    'resume',
    'resumeFile',
    'introVideoUrl',
    'contact',
    'province',
    'licenses',
    'order',
    'createdAt',
  ];

  static admin = [...this.general, 'status'];
}

const PersonSchema = SchemaFactory.createForClass(Person);

PersonSchema.index({ role: 1, status: 1, order: 1 });
PersonSchema.index({ province: 1 });

export { PersonSchema, PersonLicenseSchema };

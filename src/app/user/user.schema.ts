import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Province } from '../../common/schemas/province.schema';
import { MembershipType } from '../../common/enums/membership-type.enum';
import {
  MediaFile,
  MediaFileSchema,
} from '../../common/schemas/media-file.schema';

/**
 * What a user is allowed to do. An array on the document, so one person can be
 * both a member and an administrator without a second account.
 *
 * `SUPER_ADMIN` sees every province; `PROVINCE_ADMIN` is scoped to the ones
 * listed in `managedProvinces`.
 */
export enum UserRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super-admin',
  PROVINCE_ADMIN = 'province-admin',
  USER = 'user',
}

/**
 * Where the user stands with the association.
 *
 * `REGISTERING` is the state a self-registered user lands in before an admin
 * has looked at them; `ACTIVE` is an approved member; `REJECTED` records a
 * decision (with `rejectionReason`) rather than deleting the row, so the person
 * can be told why. `DELETED` is the soft-delete tombstone every read filters
 * out — see the `{ status: { $ne: DELETED } }` guard in the services.
 */
export enum UserStatus {
  REGISTERING = 'registering',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

export enum UserSex {
  MAN = 'man',
  WOMAN = 'woman',
}

/**
 * The user's *highest* educational level — one value, not a history.
 *
 * The list ends in `OTHER` because the association's own list is open-ended.
 */
export enum EducationLevel {
  POSTDOC = 'postdoc',
  PHD = 'phd',
  MASTERS = 'masters',
  BACHELORS = 'bachelors',
  STUDENT = 'student',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String })
  email: string;

  @Prop({ type: String, unique: true })
  mobile: string;

  @Prop({ type: String })
  fullName: string;

  /** Latin spelling of the name, as printed on the membership card. */
  @Prop({ type: String })
  latinFullName: string;

  @Prop({ type: String, minlength: 10, maxlength: 10, unique: true })
  nationalCode: string;

  @Prop({ type: String, select: false })
  password: string;

  @Prop({ type: String, enum: UserSex })
  sex: UserSex;

  @Prop({ type: Date })
  birthday: Date;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  roles: UserRole[];

  /** The user's own province. Not the same thing as `managedProvinces`. */
  @Prop({ type: Types.ObjectId, ref: Province.name })
  province: Province;

  /**
   * The provinces a `PROVINCE_ADMIN` may administer. Empty for everyone else;
   * a `SUPER_ADMIN` is not scoped and does not list them here.
   */
  @Prop({ type: [{ type: Types.ObjectId, ref: Province.name }], default: [] })
  managedProvinces: Province[];

  // --- Identity, transcribed from the شناسنامه -------------------------------
  // All optional: someone who registered before these fields existed has none
  // of them, and completeness is enforced at the membership application rather
  // than here, where a rejection would lock an existing member out of saving
  // anything at all.

  @Prop({ type: String })
  fatherName: string;

  /**
   * شماره شناسنامه — the birth-certificate serial. NOT `nationalCode`, the
   * 10-digit national id; the association records both.
   */
  @Prop({ type: String })
  idNumber: string;

  @Prop({ type: String })
  idIssuancePlace: string;

  @Prop({ type: String, enum: MaritalStatus })
  maritalStatus: MaritalStatus;

  /** تلفن ثابت / فکس. Optional even on an otherwise complete profile. */
  @Prop({ type: String })
  landline: string;

  // --- Education ------------------------------------------------------------

  @Prop({ type: String, enum: EducationLevel })
  educationLevel: EducationLevel;

  @Prop({ type: String })
  fieldOfStudy: string;

  @Prop({ type: String })
  university: string;

  @Prop({ type: Date })
  degreeDate: Date;

  // --- Membership -----------------------------------------------------------

  @Prop({ type: String, enum: MembershipType })
  membershipType: MembershipType;

  /**
   * Sequential membership number, assigned once on approval and never reused.
   * Sparse because only approved members have one.
   */
  @Prop({ type: Number, unique: true, sparse: true })
  membershipNo: number;

  /**
   * When this membership lapses. Null means "no dated membership": anyone not
   * currently active, and `HONORARY` members, who are granted rather than
   * billed and never expire.
   *
   * A null on an active member reads as NOT expired — failing open, so a bug in
   * the stamping path cannot lock a paid-up member out of their own account.
   */
  @Prop({ type: Date })
  membershipExpiresAt: Date;

  /**
   * When the one-time `REGULAR` entrance fee stopped being owed — either
   * because it settled or because the member was grandfathered in.
   *
   * Deliberately NOT `...PaidAt`: money actually received lives in `Payment`,
   * and conflating the two makes every entrance-revenue query wrong.
   */
  @Prop({ type: Date })
  entranceFeeSettledAt: Date;

  @Prop({ type: String })
  rejectionReason: string;

  /**
   * Personal photo as printed on the membership card. Dimensions on the
   * embedded `MediaFile` let the card renderer lay it out without fetching
   * the object, and let photo checks express themselves in pixels.
   */
  @Prop({ type: MediaFileSchema })
  photo?: MediaFile;

  @Prop({ type: Date })
  mobileVerifiedAt: Date;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.REGISTERING })
  status: UserStatus;

  @Prop({ type: Date })
  createdAt: Date;
}

export class UserProp {
  static general = [
    'mobile',
    'email',
    'fullName',
    'latinFullName',
    'sex',
    'birthday',
    'province',
    'nationalCode',
    'roles',
    'fatherName',
    'idNumber',
    'idIssuancePlace',
    'maritalStatus',
    'landline',
    'educationLevel',
    'fieldOfStudy',
    'university',
    'degreeDate',
    'membershipType',
    'membershipNo',
    'membershipExpiresAt',
    'photo',
    'createdAt',
  ];

  static admin = [
    ...this.general,
    'status',
    'managedProvinces',
    'entranceFeeSettledAt',
    'rejectionReason',
    'mobileVerifiedAt',
  ];
}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ status: 1, createdAt: -1 });
UserSchema.index({ province: 1 });

export { UserSchema };

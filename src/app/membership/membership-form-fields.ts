import { MembershipType } from '../../common/enums/membership-type.enum';
import { MemberDocumentKind } from '../user/member-document.schema';

/**
 * How the apply form renders a field, and how the write path validates it.
 *
 * `province` is a picker over the `Province` collection whose value is a province
 * id; `date` submits a machine-generated ISO string, never typed digits; `code`
 * covers licence and reference numbers, which hold letters and slashes as well as
 * digits.
 */
export enum MembershipFieldKind {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  PROVINCE = 'province',
  DATE = 'date',
  YEAR = 'year',
  TEL = 'tel',
  POSTAL = 'postal',
  CODE = 'code',
}

export type MembershipFieldDescriptor = {
  /** The key this answer is stored under in `MembershipRequest.formData`. */
  key: string;
  required: boolean;
  kind: MembershipFieldKind;
};

/**
 * Kinds whose values must render and edit left-to-right regardless of page
 * direction. Phone numbers, postal codes and licence numbers all bidi-reorder
 * inside a Persian (RTL) page otherwise, displaying something other than what was
 * submitted and stored.
 */
export const LTR_FIELD_KINDS: ReadonlySet<MembershipFieldKind> = new Set([
  MembershipFieldKind.TEL,
  MembershipFieldKind.POSTAL,
  MembershipFieldKind.CODE,
]);

/**
 * Kinds whose values are numbers rather than words, so Persian and Arabic-Indic
 * digits in them are folded to ASCII before storage.
 *
 * `TEXT` and `TEXTAREA` are absent on purpose: a centre named "مرکز ۲" wrote its
 * own name, and folding display text edits someone's words. `DATE` is absent
 * because it never carries typed digits. `CODE` is included even though licence
 * numbers hold letters and slashes too — folding touches only the digits inside.
 */
export const NUMERIC_FIELD_KINDS: ReadonlySet<MembershipFieldKind> = new Set([
  MembershipFieldKind.YEAR,
  MembershipFieldKind.TEL,
  MembershipFieldKind.POSTAL,
  MembershipFieldKind.CODE,
]);

/**
 * What each tier's application asks for, and therefore what may appear in a
 * `MembershipRequest.formData`.
 *
 * The registry is here rather than in the schema because `formData` is
 * deliberately schemaless: an application is a snapshot of the questions asked at
 * the time, and changing the questions must not rewrite or invalidate answers
 * already submitted under the old set.
 */
export const MEMBERSHIP_FORM_FIELDS: Record<
  MembershipType,
  MembershipFieldDescriptor[]
> = {
  // The centre the member owns and holds the activity licence for.
  [MembershipType.REGULAR]: [
    { key: 'centerName', required: true, kind: MembershipFieldKind.TEXT },
    { key: 'licenseAuthority', required: true, kind: MembershipFieldKind.TEXT },
    { key: 'centerFounder', required: true, kind: MembershipFieldKind.TEXT },
    {
      key: 'centerTechnicalManager',
      required: true,
      kind: MembershipFieldKind.TEXT,
    },
    // NOT `licenseNumber`: the legacy REGULAR set used that key for the member's
    // personal consulting licence, which is a different thing. Reusing it would
    // relabel historical answers as the centre's activity licence.
    {
      key: 'activityLicenseNumber',
      required: true,
      kind: MembershipFieldKind.CODE,
    },
    { key: 'centerStartYear', required: true, kind: MembershipFieldKind.YEAR },
    {
      key: 'licenseValidUntil',
      required: true,
      kind: MembershipFieldKind.DATE,
    },
    { key: 'provinceId', required: true, kind: MembershipFieldKind.PROVINCE },
    { key: 'city', required: true, kind: MembershipFieldKind.TEXT },
    { key: 'postalCode', required: true, kind: MembershipFieldKind.POSTAL },
    { key: 'centerPhone', required: true, kind: MembershipFieldKind.TEL },
    {
      key: 'centerAddress',
      required: true,
      kind: MembershipFieldKind.TEXTAREA,
    },
  ],
  // The centre the member works at, and who supervises them there.
  [MembershipType.AFFILIATE]: [
    { key: 'centerName', required: true, kind: MembershipFieldKind.TEXT },
    {
      key: 'centerLicenseNumber',
      required: true,
      kind: MembershipFieldKind.CODE,
    },
    { key: 'supervisorName', required: true, kind: MembershipFieldKind.TEXT },
    { key: 'provinceId', required: true, kind: MembershipFieldKind.PROVINCE },
    { key: 'city', required: true, kind: MembershipFieldKind.TEXT },
    { key: 'centerPhone', required: false, kind: MembershipFieldKind.TEL },
  ],
  // University, field of study and degree level live on the User document, so the
  // application itself only needs the student number.
  [MembershipType.STUDENT]: [
    { key: 'studentNumber', required: true, kind: MembershipFieldKind.CODE },
  ],
  // Granted by an admin, never applied for.
  [MembershipType.HONORARY]: [],
};

/** The one document kind an application of this tier cannot be submitted without. */
export const MEMBERSHIP_REQUIRED_DOCUMENT: Partial<
  Record<MembershipType, MemberDocumentKind>
> = {
  [MembershipType.REGULAR]: MemberDocumentKind.ACTIVITY_LICENSE,
  [MembershipType.AFFILIATE]: MemberDocumentKind.WORKPLACE_CERTIFICATE,
  [MembershipType.STUDENT]: MemberDocumentKind.STUDENT_CARD,
};

/**
 * The field set in use before the current one, retained ONLY so an admin reading
 * an old application can see its answers labelled.
 *
 * Nothing writes these keys. Never reuse one in `MEMBERSHIP_FORM_FIELDS` — a
 * shared key would render a historical answer under a new label that means
 * something else.
 */
export const LEGACY_MEMBERSHIP_FORM_FIELDS: Record<MembershipType, string[]> = {
  [MembershipType.REGULAR]: [
    'specialty',
    'degree',
    'experienceYears',
    'licenseNumber',
    'organization',
  ],
  [MembershipType.AFFILIATE]: [
    'fieldOfActivity',
    'affiliation',
    'role',
    'relatedExperience',
  ],
  [MembershipType.STUDENT]: [
    'university',
    'studentId',
    'fieldOfStudy',
    'degreeLevel',
    'expectedGraduation',
  ],
  [MembershipType.HONORARY]: ['bio', 'contributions', 'nominatedBy'],
};

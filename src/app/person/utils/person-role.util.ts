import {
  PersonRole,
  ProvincePosition,
  ROLES_WITH_POSITION_TITLE,
  ROLES_WITH_PROVINCE,
  ROLES_WITH_SUB_ROLE,
  VicePresidentSubRole,
} from '../person.schema';

/**
 * Checks if a given person role utilizes the `subRole` field.
 */
export function roleKeepsSubRole(role: PersonRole): boolean {
  return ROLES_WITH_SUB_ROLE.includes(role);
}

/**
 * Checks if a given person role belongs to a specific province.
 */
export function roleKeepsProvince(role: PersonRole): boolean {
  return ROLES_WITH_PROVINCE.includes(role);
}

/**
 * Checks if a given person role uses a free-text `positionTitle`.
 */
export function roleKeepsPositionTitle(role: PersonRole): boolean {
  return ROLES_WITH_POSITION_TITLE.includes(role);
}

/**
 * Validates whether the provided `subRole` is valid for the given `role`.
 */
export function isValidSubRoleForRole(
  role: PersonRole,
  subRole?: string,
): boolean {
  if (!roleKeepsSubRole(role)) {
    return !subRole || subRole.trim() === '';
  }

  if (!subRole || !subRole.trim()) {
    return true; // subRole is optional even when permitted
  }

  const normalized = subRole.trim().toLowerCase();

  if (role === PersonRole.VICE_PRESIDENT) {
    return Object.values(VicePresidentSubRole).some(
      (v) => v.toLowerCase() === normalized,
    );
  }

  if (role === PersonRole.PROVINCE_OFFICIAL) {
    return Object.values(ProvincePosition).some(
      (p) => p.toLowerCase() === normalized,
    );
  }

  return false;
}

const PROVINCE_POSITIONS_ORDER: string[] = [
  ProvincePosition.DIRECTOR,
  ProvincePosition.DEPUTY_DIRECTOR,
  ProvincePosition.SECRETARY,
  ProvincePosition.PUBLIC_RELATIONS,
  ProvincePosition.ADVERTISING,
  ProvincePosition.CONFERENCES,
];

/**
 * Sort index for a province-position slug; unknown/empty sorts last.
 */
export function provincePositionOrder(slug?: string | null): number {
  if (!slug) return PROVINCE_POSITIONS_ORDER.length;
  const index = PROVINCE_POSITIONS_ORDER.indexOf(slug.toLowerCase().trim());
  return index === -1 ? PROVINCE_POSITIONS_ORDER.length : index;
}

/**
 * Formats a Vice President subrole slug.
 */
export function slugifyVp(subRole: string): string {
  return subRole.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Maps a URL slug back to its `VicePresidentSubRole` enum value, or undefined if unknown.
 */
export function unslugifyVp(slug: string): VicePresidentSubRole | undefined {
  const normalized = slug.toLowerCase().trim();
  return Object.values(VicePresidentSubRole).find(
    (v) => v.toLowerCase() === normalized,
  );
}

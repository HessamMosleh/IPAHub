import { Person } from '../person.schema';
import { AdminListPeopleDto } from '../dtos/admin-list-people.dto';
import { CreatePersonDto } from '../dtos/create-person.dto';
import { UpdatePersonDto } from '../dtos/update-person.dto';
import { CreatePersonLicenseDto } from '../dtos/person-license.dto';
import { ReorderPersonDto } from '../dtos/reorder-person.dto';
import { AuthenticatedUser } from '../../auth/types';

export interface PaginatedPeople {
  data: Person[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative Person Service contract.
 * Segregated from the public client interface (ISP).
 */
export interface IPersonAdminService {
  /**
   * Retrieves paginated persons with filters (role, subRole, province, status, search),
   * enforcing Province Admin scoping when applicable.
   */
  findAll(
    query?: AdminListPeopleDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedPeople>;

  /**
   * Retrieves any person by MongoDB ObjectId, validating province-admin scope.
   */
  findById(id: string, user?: AuthenticatedUser): Promise<Person>;

  /**
   * Creates a new person record with domain validation for role-specific fields.
   */
  create(dto: CreatePersonDto, user?: AuthenticatedUser): Promise<Person>;

  /**
   * Updates an existing person with domain validation and scoping checks.
   */
  update(
    id: string,
    dto: UpdatePersonDto,
    user?: AuthenticatedUser,
  ): Promise<Person>;

  /**
   * Toggles the active status between ACTIVE and DISABLED.
   */
  toggleStatus(id: string, user?: AuthenticatedUser): Promise<Person>;

  /**
   * Reorders a person moving up or down within their role/province grouping.
   */
  reorder(
    id: string,
    dto: ReorderPersonDto,
    user?: AuthenticatedUser,
  ): Promise<Person[]>;

  /**
   * Appends a new professional license to the person's profile.
   */
  addLicense(
    personId: string,
    dto: CreatePersonLicenseDto,
    user?: AuthenticatedUser,
  ): Promise<Person>;

  /**
   * Removes a license from the person's profile by its subdocument ID.
   */
  deleteLicense(
    personId: string,
    licenseId: string,
    user?: AuthenticatedUser,
  ): Promise<Person>;

  /**
   * Disables or deletes a person record.
   */
  delete(id: string, user?: AuthenticatedUser): Promise<{ success: boolean }>;
}

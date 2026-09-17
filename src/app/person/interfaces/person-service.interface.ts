import { Person, PersonRole } from '../person.schema';
import { ListPeopleDto } from '../dtos/list-people.dto';

/**
 * Public/Client Person Service contract.
 * Adheres to Interface Segregation Principle (ISP) — exposes read-only
 * queries for publicly accessible, active members and officials.
 */
export interface IPersonService {
  /**
   * Retrieves all active persons matching optional query filters (role, subRole, province, search).
   * Populates province details and applies domain-specific ordering.
   */
  findAllActive(query?: ListPeopleDto): Promise<Person[]>;

  /**
   * Retrieves a single active person by MongoDB ObjectId.
   * Throws NotFoundException if person does not exist or is disabled.
   */
  findById(id: string): Promise<Person>;

  /**
   * Retrieves active persons filtered by organisational role and optional sub-role.
   */
  findByRole(role: PersonRole, subRole?: string): Promise<Person[]>;

  /**
   * Retrieves the active Vice President for a specific area sub-role.
   */
  findVicePresident(subRole: string): Promise<Person>;

  /**
   * Retrieves all active officials belonging to a province (by province slug or ObjectId),
   * ordered by province office position hierarchy.
   */
  findProvinceOfficials(provinceIdentifier: string): Promise<Person[]>;
}

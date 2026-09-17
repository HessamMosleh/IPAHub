import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { Person, PersonProp, PersonRole } from '../person.schema';
import { Province } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { translate } from '../../../common/utils/translate';
import { ListPeopleDto } from '../dtos/list-people.dto';
import { IPersonService } from '../interfaces/person-service.interface';
import { provincePositionOrder } from '../utils/person-role.util';

/**
 * Public/Client Person Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for publicly accessible, active personnel and officials.
 */
@Injectable()
export class PersonService implements IPersonService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<Person>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Retrieves all active personnel matching optional filters, sorted according to
   * position hierarchy (for province officials) and display order.
   */
  async findAllActive(query?: ListPeopleDto): Promise<Person[]> {
    const filter: QueryFilter<Person> = {
      status: ActiveStatus.ACTIVE,
    };

    if (query?.role) {
      filter.role = query.role;
    }

    if (query?.subRole && query.subRole.trim()) {
      filter.subRole = query.subRole.trim().toLowerCase();
    }

    if (query?.province && query.province.trim()) {
      const provInput = query.province.trim();
      if (isValidObjectId(provInput)) {
        filter.province = new Types.ObjectId(provInput);
      } else {
        const province = await this.provinceModel
          .findOne({ slug: provInput.toLowerCase() })
          .select('_id')
          .exec();
        if (!province) {
          return [];
        }
        filter.province = province._id;
      }
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { 'name.en': regex },
        { 'name.fa': regex },
        { 'positionTitle.en': regex },
        { 'positionTitle.fa': regex },
        { 'about.en': regex },
        { 'about.fa': regex },
      ];
    }

    const people = await this.personModel
      .find(filter)
      .select(PersonProp.general)
      .populate('province')
      .sort({ order: 1, createdAt: 1 })
      .exec();

    // If querying province officials or mixed roles, sort province officials by positional rank
    return people.sort((a, b) => {
      if (
        a.role === PersonRole.PROVINCE_OFFICIAL &&
        b.role === PersonRole.PROVINCE_OFFICIAL
      ) {
        const posDiff =
          provincePositionOrder(a.subRole) - provincePositionOrder(b.subRole);
        if (posDiff !== 0) return posDiff;
      }
      return a.order - b.order;
    });
  }

  /**
   * Retrieves a single active person by MongoDB ObjectId.
   */
  async findById(id: string): Promise<Person> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    const person = await this.personModel
      .findOne({ _id: id, status: ActiveStatus.ACTIVE })
      .select(PersonProp.general)
      .populate('province')
      .exec();

    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    return person;
  }

  /**
   * Retrieves active persons filtered by role and optional sub-role.
   */
  async findByRole(role: PersonRole, subRole?: string): Promise<Person[]> {
    return this.findAllActive({ role, subRole });
  }

  /**
   * Retrieves the active Vice President for a specific area sub-role.
   */
  async findVicePresident(subRole: string): Promise<Person> {
    const normalized = subRole.trim().toLowerCase();
    const person = await this.personModel
      .findOne({
        role: PersonRole.VICE_PRESIDENT,
        subRole: normalized,
        status: ActiveStatus.ACTIVE,
      })
      .select(PersonProp.general)
      .exec();

    if (!person) {
      throw new NotFoundException(translate('errors.PERSON_NOT_FOUND'));
    }

    return person;
  }

  /**
   * Retrieves all active officials for a given province.
   */
  async findProvinceOfficials(provinceIdentifier: string): Promise<Person[]> {
    return this.findAllActive({
      role: PersonRole.PROVINCE_OFFICIAL,
      province: provinceIdentifier,
    });
  }
}

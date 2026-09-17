import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserProp, UserStatus } from './user.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Province } from '../../common/schemas/province.schema';
import { translate } from '../../common/utils/translate';

const HASH_ROUNDS = 10;
const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  async createUser(dto: CreateUserDto, hashedPassword?: string): Promise<User> {
    await this.ensureProvinceExists(dto.province);
    await this.ensureUniqueIdentity(dto.mobile, dto.nationalCode);

    try {
      return await this.userModel.create({
        ...dto,
        province: new Types.ObjectId(dto.province),
        password: hashedPassword ?? (await this.hashPassword(dto.password)),
      });
    } catch (error) {
      this.throwIfDuplicateKey(error);
      throw error;
    }
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, HASH_ROUNDS);
  }

  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  async findAll(
    search: QueryFilter<User>,
    project: string | string[] = UserProp.general,
    options?: { sort?; limit?; justCount?: boolean },
  ): Promise<User[] | number> {
    if (options?.justCount) {
      return this.userModel.countDocuments(search);
    }

    let query = this.userModel.find(search).select(project);

    if (options?.sort) {
      query = query.sort(options.sort);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query.exec();
  }

  async findOne(
    search: QueryFilter<User>,
    project: string | string[] = UserProp.general,
  ): Promise<User> {
    const user = await this.userModel
      .findOne({ ...search, status: { $ne: UserStatus.DELETED } })
      .select(project)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const update: Record<string, unknown> = { ...dto };

    if (dto.province) {
      await this.ensureProvinceExists(dto.province);
      update.province = new Types.ObjectId(dto.province);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .select(UserProp.general)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    return user;
  }

  private async ensureProvinceExists(provinceId: string): Promise<void> {
    const exists = await this.provinceModel.exists({ _id: provinceId });

    if (!exists) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }
  }

  private async ensureUniqueIdentity(
    mobile: string,
    nationalCode: string,
  ): Promise<void> {
    const existing = await this.userModel
      .findOne({
        $or: [{ mobile }, { nationalCode }],
        status: { $ne: UserStatus.DELETED },
      })
      .select('mobile nationalCode')
      .lean()
      .exec();

    if (!existing) {
      return;
    }

    if (existing.mobile === mobile) {
      throw new ConflictException(translate('errors.MOBILE_EXISTS'));
    }

    throw new ConflictException(translate('errors.NATIONAL_CODE_EXISTS'));
  }

  private throwIfDuplicateKey(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === DUPLICATE_KEY_ERROR
    ) {
      const keyPattern = (error as { keyPattern?: Record<string, number> })
        .keyPattern;

      if (keyPattern?.mobile) {
        throw new ConflictException(translate('errors.MOBILE_EXISTS'));
      }

      if (keyPattern?.nationalCode) {
        throw new ConflictException(translate('errors.NATIONAL_CODE_EXISTS'));
      }

      throw new ConflictException(translate('errors.USER_EXISTS'));
    }
  }
}

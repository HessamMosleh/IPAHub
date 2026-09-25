import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserProp, UserRole, UserStatus } from './user.schema';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateMemberProfileDto } from './dtos/update-member-profile.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { MemberDocumentResponseDto } from './dtos/member-document-response.dto';
import {
  MemberDocument,
  MemberDocumentKind,
  MemberDocumentProp,
} from './member-document.schema';
import { Province } from '../../common/schemas/province.schema';
import { MediaFile } from '../../common/schemas/media-file.schema';
import { StorageService } from '../../common/storage/storage.service';
import { translate } from '../../common/utils/translate';
import { toInternationalMobile } from '../../common/utils/mobile.util';

const HASH_ROUNDS = 10;
const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
    @InjectModel(MemberDocument.name)
    private readonly memberDocumentModel: Model<MemberDocument>,
    private readonly storage: StorageService,
  ) {}

  async registerMember(input: {
    mobile: string;
    nationalCode: string;
    fullName: string;
    latinFullName: string;
    province: string;
  }): Promise<User> {
    await this.ensureProvinceExists(input.province);
    await this.ensureUniqueIdentity(input.mobile, input.nationalCode);

    try {
      return await this.userModel.create({
        mobile: toInternationalMobile(input.mobile),
        nationalCode: input.nationalCode,
        fullName: input.fullName,
        latinFullName: input.latinFullName,
        province: new Types.ObjectId(input.province),
        roles: [UserRole.USER],
        status: UserStatus.REGISTERING,
        mobileVerifiedAt: new Date(),
      });
    } catch (error) {
      this.throwIfDuplicateKey(error);
      throw error;
    }
  }

  async findByMobileOptional(mobile: string): Promise<User | null> {
    return this.userModel
      .findOne({ mobile, status: { $ne: UserStatus.DELETED } })
      .select(UserProp.admin)
      .exec();
  }

  async markMobileVerified(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { mobileVerifiedAt: new Date() })
      .exec();
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
    project: string | string[] = UserProp.admin,
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
      .select(UserProp.admin)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    return user;
  }

  async updateMemberProfile(
    userId: string,
    dto: UpdateMemberProfileDto,
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .select(UserProp.admin)
      .exec();

    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    return user;
  }

  async setPhoto(userId: string, photo: MediaFile): Promise<User> {
    const existing = await this.findOne({ _id: userId });
    if (existing.photo?.key) {
      await this.storage.deleteObject(existing.photo.key).catch(() => undefined);
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { photo }, { new: true })
      .select(UserProp.admin)
      .exec();

    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }
    return user;
  }

  async listDocuments(userId: string): Promise<MemberDocumentResponseDto[]> {
    const docs = await this.memberDocumentModel
      .find({ user: new Types.ObjectId(userId) })
      .select(MemberDocumentProp.general)
      .sort({ kind: 1 })
      .exec();

    return docs.map((d) => this.toDocumentResponse(d));
  }

  async getDocument(
    userId: string,
    kind: MemberDocumentKind,
  ): Promise<MemberDocument> {
    const doc = await this.memberDocumentModel
      .findOne({ user: new Types.ObjectId(userId), kind })
      .exec();
    if (!doc) {
      throw new NotFoundException(translate('errors.MEMBER_DOCUMENT_NOT_FOUND'));
    }
    return doc;
  }

  async upsertDocument(
    userId: string,
    kind: MemberDocumentKind,
    file: MediaFile,
  ): Promise<MemberDocumentResponseDto> {
    const existing = await this.memberDocumentModel
      .findOne({ user: new Types.ObjectId(userId), kind })
      .exec();

    if (existing?.file?.key) {
      await this.storage.deleteObject(existing.file.key).catch(() => undefined);
      existing.file = file;
      await existing.save();
      return this.toDocumentResponse(existing);
    }

    const created = await this.memberDocumentModel.create({
      user: new Types.ObjectId(userId),
      kind,
      file,
    });
    return this.toDocumentResponse(created);
  }

  async deleteDocument(
    userId: string,
    kind: MemberDocumentKind,
  ): Promise<void> {
    const doc = await this.memberDocumentModel
      .findOneAndDelete({ user: new Types.ObjectId(userId), kind })
      .exec();
    if (doc?.file?.key) {
      await this.storage.deleteObject(doc.file.key).catch(() => undefined);
    }
  }

  toResponse(user: User): UserResponseDto {
    const provinceId =
      typeof user.province === 'object' && user.province && '_id' in user.province
        ? (user.province as { _id: Types.ObjectId })._id.toString()
        : typeof user.province === 'string'
          ? user.province
          : String(user.province);

    return {
      _id: user._id.toString(),
      mobile: user.mobile,
      email: user.email,
      fullName: user.fullName,
      latinFullName: user.latinFullName,
      nationalCode: user.nationalCode,
      sex: user.sex,
      birthday: user.birthday,
      roles: user.roles ?? [UserRole.USER],
      province: provinceId,
      managedProvinces: (user.managedProvinces || []).map((p) =>
        typeof p === 'object' && p && '_id' in p
          ? (p as { _id: Types.ObjectId })._id.toString()
          : String(p),
      ),
      status: user.status,
      fatherName: user.fatherName,
      idNumber: user.idNumber,
      idIssuancePlace: user.idIssuancePlace,
      maritalStatus: user.maritalStatus,
      landline: user.landline,
      educationLevel: user.educationLevel,
      fieldOfStudy: user.fieldOfStudy,
      university: user.university,
      degreeDate: user.degreeDate,
      membershipType: user.membershipType,
      membershipNo: user.membershipNo,
      membershipExpiresAt: user.membershipExpiresAt,
      photo: user.photo,
      mobileVerifiedAt: user.mobileVerifiedAt,
      rejectionReason: user.rejectionReason,
      createdAt: user.createdAt,
    };
  }

  private toDocumentResponse(doc: MemberDocument): MemberDocumentResponseDto {
    return {
      _id: doc._id.toString(),
      kind: doc.kind,
      file: doc.file,
      createdAt: doc.createdAt,
    };
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import {
  CooperationRequest,
  CooperationRequestProp,
  CooperationRequestStatus,
} from '../cooperation-request.schema';
import { User, UserStatus } from '../../user/user.schema';
import { Province } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { translate } from '../../../common/utils/translate';
import { foldDigits } from '../../../common/utils/digit.util';
import { CreateCooperationRequestDto } from '../dtos/create-cooperation-request.dto';
import { ListCooperationRequestsDto } from '../dtos/list-cooperation-requests.dto';
import {
  ICooperationService,
  PaginatedUserCooperationRequests,
} from '../interfaces/cooperation-service.interface';

/** 30-day grace period after membership expiry during which benefits still apply. */
const MEMBERSHIP_GRACE_DAYS = 30;

/**
 * Public/Member Client Cooperation Service.
 * Adheres to SRP — handles member-initiated cooperation requests:
 * submitting proposals and retrieving own requests with no administrative privileges.
 */
@Injectable()
export class CooperationService implements ICooperationService {
  constructor(
    @InjectModel(CooperationRequest.name)
    private readonly cooperationRequestModel: Model<CooperationRequest>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
  ) {}

  /**
   * Submits a new cooperation proposal for an active approved member.
   *
   * Enforces business rules:
   * 1. Member must be ACTIVE and not lapsed (outside grace window).
   * 2. Province must exist and be active.
   * 3. At least one unique cooperation field is required.
   * 4. Member cannot have an open PENDING proposal (one at a time).
   * 5. Postal code and telephone digits are normalised to ASCII.
   */
  async create(
    dto: CreateCooperationRequestDto,
    userId: string,
  ): Promise<CooperationRequest> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    this.assertMemberActive(user);

    if (!isValidObjectId(dto.province)) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    const province = await this.provinceModel
      .findOne({ _id: dto.province, status: ActiveStatus.ACTIVE })
      .exec();
    if (!province) {
      throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
    }

    if (!dto.fields || dto.fields.length === 0) {
      throw new BadRequestException(
        translate('errors.AT_LEAST_ONE_COOPERATION_FIELD_REQUIRED'),
      );
    }

    const uniqueFields = Array.from(new Set(dto.fields));

    // Ensure member has no open PENDING request
    const existingPending = await this.cooperationRequestModel
      .findOne({
        user: new Types.ObjectId(userId),
        status: CooperationRequestStatus.PENDING,
      })
      .exec();

    if (existingPending) {
      throw new ConflictException(
        translate('errors.COOPERATION_REQUEST_ALREADY_PENDING'),
      );
    }

    const normalizedPostalCode = foldDigits(dto.postalCode).trim();
    const normalizedTelephone = foldDigits(dto.telephone).trim();

    return this.cooperationRequestModel.create({
      user: new Types.ObjectId(userId),
      fields: uniqueFields,
      description: dto.description ? dto.description.trim() : '',
      province: new Types.ObjectId(dto.province),
      city: dto.city.trim(),
      postalAddress: dto.postalAddress.trim(),
      postalCode: normalizedPostalCode,
      telephone: normalizedTelephone,
      status: CooperationRequestStatus.PENDING,
    });
  }

  /**
   * Retrieves the authenticated member's submitted cooperation requests.
   */
  async findAllByUser(
    userId: string,
    query?: ListCooperationRequestsDto,
  ): Promise<PaginatedUserCooperationRequests> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<CooperationRequest> = {
      user: new Types.ObjectId(userId),
    };

    if (query?.status) {
      filter.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.cooperationRequestModel
        .find(filter)
        .select(CooperationRequestProp.general)
        .populate('province', 'slug name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.cooperationRequestModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves a specific cooperation request belonging to the authenticated member.
   */
  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<CooperationRequest> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    const request = await this.cooperationRequestModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(CooperationRequestProp.general)
      .populate('province', 'slug name')
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    return request;
  }

  /**
   * Asserts member is ACTIVE and membership has not lapsed beyond grace period.
   */
  private assertMemberActive(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(translate('errors.MEMBERSHIP_NOT_ACTIVE'));
    }

    if (user.membershipType === MembershipType.HONORARY) {
      return;
    }

    if (!user.membershipExpiresAt) {
      return; // Null expiry fails open
    }

    const expiryTime = new Date(user.membershipExpiresAt).getTime();
    const graceEndsTime =
      expiryTime + MEMBERSHIP_GRACE_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() > graceEndsTime) {
      throw new ForbiddenException(translate('errors.MEMBERSHIP_NOT_ACTIVE'));
    }
  }
}

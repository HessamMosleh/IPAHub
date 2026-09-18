import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import {
  APPLICABLE_MEMBERSHIP_TYPES,
  MembershipType,
} from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import { User, UserStatus } from '../../user/user.schema';
import {
  MemberDocument,
  MemberDocumentKind,
} from '../../user/member-document.schema';
import { Province } from '../../../common/schemas/province.schema';
import {
  MembershipRequest,
  MembershipRequestKind,
  MembershipRequestProp,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { MembershipFee } from '../schemas/membership-fee.schema';
import { MembershipTypeInfo } from '../schemas/membership-type-info.schema';
import { MEMBERSHIP_REQUIRED_DOCUMENT } from '../schemas/membership-form-fields';
import {
  FeeRowInput,
  idToString,
  priceFor,
  quoteMembership,
} from '../utils/membership-pricing.util';
import {
  hasValidFormats,
  parseMembershipForm,
  provinceFieldKey,
} from '../utils/membership-form.util';
import { isProfileComplete } from '../utils/membership-profile.util';
import { MembershipActivationService } from './membership-activation.service';
import {
  IMembershipService,
  PaginatedUserMembershipRequests,
} from '../interfaces/membership-service.interface';
import { SubmitMembershipRequestDto } from '../dtos/submit-membership-request.dto';
import { ListMembershipRequestsDto } from '../dtos/list-membership-requests.dto';
import { MembershipOptionsResponseDto } from '../dtos/membership-option-response.dto';

/** The request statuses that block a member from opening another request. */
const OPEN_STATUSES: MembershipRequestStatus[] = [
  MembershipRequestStatus.PENDING,
  MembershipRequestStatus.AWAITING_PAYMENT,
];

/**
 * Public/Member Client Membership Service.
 * Adheres to SRP — handles member-initiated membership operations: viewing
 * tiers with live quotes, applying, renewing, and reviewing their own requests.
 * No pricing configuration or approval authority is exposed here.
 */
@Injectable()
export class MembershipService implements IMembershipService {
  constructor(
    @InjectModel(MembershipRequest.name)
    private readonly requestModel: Model<MembershipRequest>,
    @InjectModel(MembershipFee.name)
    private readonly feeModel: Model<MembershipFee>,
    @InjectModel(MembershipTypeInfo.name)
    private readonly typeInfoModel: Model<MembershipTypeInfo>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(MemberDocument.name)
    private readonly memberDocumentModel: Model<MemberDocument>,
    @InjectModel(Province.name)
    private readonly provinceModel: Model<Province>,
    private readonly activationService: MembershipActivationService,
  ) {}

  async getOptions(userId: string): Promise<MembershipOptionsResponseDto> {
    const user = await this.loadUser(userId);

    const feeRows = await this.loadFeeRows();
    const infos = await this.typeInfoModel.find().exec();
    const infoByType = new Map(infos.map((i) => [i.type, i]));

    const currentType = this.currentTierOf(user);
    const provinceId = this.provinceIdOf(user);
    const entranceSettled = !!user.entranceFeeSettledAt;

    const hasOpenRequest = !!(await this.requestModel
      .findOne({
        user: new Types.ObjectId(userId),
        status: { $in: OPEN_STATUSES },
      })
      .exec());

    const options = APPLICABLE_MEMBERSHIP_TYPES.map((type) => {
      const info = infoByType.get(type);
      const quote = quoteMembership(
        { provinceId, currentType, entranceSettled },
        type,
        feeRows,
      );
      return {
        type,
        summary: info?.summary,
        rights: info?.rights,
        quote,
        isCurrent: currentType === type,
      };
    });

    return {
      currentType,
      membershipExpiresAt: user.membershipExpiresAt ?? null,
      hasOpenRequest,
      options,
    };
  }

  async apply(
    dto: SubmitMembershipRequestDto,
    userId: string,
  ): Promise<MembershipRequest> {
    // 1. The tier must be one a member may actually apply for.
    if (!APPLICABLE_MEMBERSHIP_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_TYPE_NOT_APPLICABLE'),
      );
    }

    const user = await this.loadUser(userId);

    // 2. Profile completeness gate.
    const documentKinds = await this.memberDocumentKinds(userId);
    if (!isProfileComplete(user, documentKinds)) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_PROFILE_INCOMPLETE'),
      );
    }

    // 3. The tier's required supporting document must be present.
    const requiredDoc = MEMBERSHIP_REQUIRED_DOCUMENT[dto.type];
    if (requiredDoc && !documentKinds.has(requiredDoc)) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_REQUIRED_DOCUMENT_MISSING'),
      );
    }

    // 4. Required form fields present, 5. formats valid.
    const parsed = parseMembershipForm(dto.type, dto.formData ?? {});
    if (!parsed.ok) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_FORM_INVALID'),
      );
    }
    if (!hasValidFormats(dto.type, parsed.data)) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_FORM_INVALID_FORMAT'),
      );
    }

    // 6. If the form carries a province id, it must reference a real province.
    const provKey = provinceFieldKey(dto.type);
    if (provKey && parsed.data[provKey]) {
      const provinceId = parsed.data[provKey];
      if (!isValidObjectId(provinceId)) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }
      const province = await this.provinceModel.findById(provinceId).exec();
      if (!province) {
        throw new NotFoundException(translate('errors.PROVINCE_NOT_FOUND'));
      }
    }

    // 7. Cannot apply for the tier already held.
    if (this.currentTierOf(user) === dto.type) {
      throw new ConflictException(
        translate('errors.MEMBERSHIP_ALREADY_SAME_TYPE'),
      );
    }

    // 8. At most one open request at a time.
    const open = await this.requestModel
      .findOne({
        user: new Types.ObjectId(userId),
        status: { $in: OPEN_STATUSES },
      })
      .exec();
    if (open) {
      throw new ConflictException(
        translate('errors.MEMBERSHIP_REQUEST_ALREADY_OPEN'),
      );
    }

    const created = await this.requestModel.create({
      user: new Types.ObjectId(userId),
      type: dto.type,
      formData: parsed.data,
      kind: MembershipRequestKind.APPLICATION,
      status: MembershipRequestStatus.PENDING,
    });

    // A not-yet-approved member re-enters "under review"; a rejection reason is
    // cleared so the applicant is no longer shown a stale refusal.
    if (user.status !== UserStatus.ACTIVE) {
      user.status = UserStatus.REGISTERING;
      user.rejectionReason = undefined as unknown as string;
      await user.save();
    }

    return created;
  }

  async renew(userId: string): Promise<MembershipRequest> {
    const user = await this.loadUser(userId);

    const type = user.membershipType;
    if (!type || type === MembershipType.HONORARY) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_NO_TYPE_TO_RENEW'),
      );
    }

    const open = await this.requestModel
      .findOne({
        user: new Types.ObjectId(userId),
        status: { $in: OPEN_STATUSES },
      })
      .exec();
    if (open) {
      throw new ConflictException(
        translate('errors.MEMBERSHIP_REQUEST_ALREADY_OPEN'),
      );
    }

    const feeRows = await this.loadFeeRows();
    const fee = priceFor(feeRows, type, this.provinceIdOf(user));

    // A renewal is self-serve and born already billed: no credit, no entrance
    // fee, and no admin vetting.
    const created = await this.requestModel.create({
      user: new Types.ObjectId(userId),
      type,
      formData: {},
      kind: MembershipRequestKind.RENEWAL,
      status: MembershipRequestStatus.AWAITING_PAYMENT,
      decidedAt: new Date(),
      fee,
      creditApplied: 0,
      entranceFee: 0,
      amountDue: fee,
      paymentStatus: fee > 0 ? PaymentStatus.PENDING : PaymentStatus.NONE,
    });

    if (fee === 0) {
      return this.activationService.activate(created._id.toString());
    }

    return created;
  }

  async findAllByUser(
    userId: string,
    query?: ListMembershipRequestsDto,
  ): Promise<PaginatedUserMembershipRequests> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<MembershipRequest> = {
      user: new Types.ObjectId(userId),
    };
    if (query?.status) filter.status = query.status;
    if (query?.kind) filter.kind = query.kind;

    const [data, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .select(MembershipRequestProp.general)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<MembershipRequest> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new NotFoundException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_FOUND'),
      );
    }

    const request = await this.requestModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(MembershipRequestProp.general)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_FOUND'),
      );
    }

    return request;
  }

  // --- helpers --------------------------------------------------------------

  private async loadUser(userId: string): Promise<User> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }
    return user;
  }

  /** The tier a member currently holds, counted only while their account is active. */
  private currentTierOf(user: User): MembershipType | null {
    if (user.status !== UserStatus.ACTIVE) return null;
    return user.membershipType ?? null;
  }

  private provinceIdOf(user: User): string | null {
    return user.province ? idToString(user.province) || null : null;
  }

  private async memberDocumentKinds(
    userId: string,
  ): Promise<Set<MemberDocumentKind>> {
    const docs = await this.memberDocumentModel
      .find({ user: new Types.ObjectId(userId) })
      .select('kind')
      .exec();
    return new Set(docs.map((d) => d.kind));
  }

  private async loadFeeRows(): Promise<FeeRowInput[]> {
    const fees = await this.feeModel.find().exec();
    return fees.map((f) => ({
      type: f.type,
      baseFee: f.baseFee,
      entranceFee: f.entranceFee,
      prices: (f.prices ?? []).map((p) => ({
        province: p.province,
        fee: p.fee,
        entranceFee: p.entranceFee,
      })),
    }));
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import { sanitizeHtml } from '../../../common/utils/sanitize-html.util';
import { User, UserRole, UserStatus } from '../../user/user.schema';
import {
  Payment,
  PaymentMethod,
  PaymentSource,
} from '../../payment/payment.schema';
import { AuthenticatedUser } from '../../auth/types';
import {
  MembershipRequest,
  MembershipRequestProp,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { MembershipFee } from '../schemas/membership-fee.schema';
import { MembershipTypeInfo } from '../schemas/membership-type-info.schema';
import {
  FeeRowInput,
  idToString,
  quoteMembership,
} from '../utils/membership-pricing.util';
import { MembershipActivationService } from './membership-activation.service';
import {
  IMembershipAdminService,
  PaginatedMembershipRequests,
} from '../interfaces/membership-admin-service.interface';
import { AdminListMembershipRequestsDto } from '../dtos/admin-list-membership-requests.dto';
import { RejectMembershipRequestDto } from '../dtos/reject-membership-request.dto';
import { MarkPaidMembershipRequestDto } from '../dtos/mark-paid-membership-request.dto';
import { UpdateMembershipFeeDto } from '../dtos/update-membership-fee.dto';
import { SetProvincePricesDto } from '../dtos/set-province-prices.dto';
import { UpdateMembershipTypeInfoDto } from '../dtos/update-membership-type-info.dto';

/** The member fields needed to quote a bill and enforce province scope. */
const APPLICANT_SELECT =
  'fullName mobile nationalCode email province status membershipType membershipExpiresAt entranceFeeSettledAt membershipNo';

/**
 * Administrative Membership Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates request review (approve / reject / mark-paid), fee configuration,
 * and tier copy management, with province-scoped access control. Activation and
 * pricing math are delegated to dedicated collaborators (DIP).
 */
@Injectable()
export class MembershipAdminService implements IMembershipAdminService {
  constructor(
    @InjectModel(MembershipRequest.name)
    private readonly requestModel: Model<MembershipRequest>,
    @InjectModel(MembershipFee.name)
    private readonly feeModel: Model<MembershipFee>,
    @InjectModel(MembershipTypeInfo.name)
    private readonly typeInfoModel: Model<MembershipTypeInfo>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    private readonly activationService: MembershipActivationService,
  ) {}

  // --- Requests -------------------------------------------------------------

  async findAllRequests(
    query?: AdminListMembershipRequestsDto,
    user?: AuthenticatedUser,
  ): Promise<PaginatedMembershipRequests> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<MembershipRequest> = {};
    if (query?.status) filter.status = query.status;
    if (query?.kind) filter.kind = query.kind;
    if (query?.type) filter.type = query.type;

    // Applicant-derived constraints: province scope, province filter, and search
    // all resolve to a set of user ids the request must belong to.
    const userIds = await this.resolveApplicantIds(query, user);
    if (userIds !== null) {
      filter.user = { $in: userIds };
    }

    const [data, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .select(MembershipRequestProp.admin)
        .populate('user', APPLICANT_SELECT)
        .sort({ status: 1, createdAt: -1 })
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

  async findRequestById(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<MembershipRequest> {
    const request = await this.loadRequest(id, APPLICANT_SELECT);
    this.assertRequestScope(request, user);
    return request;
  }

  async approve(
    id: string,
    user?: AuthenticatedUser,
  ): Promise<MembershipRequest> {
    const request = await this.loadRequest(id, APPLICANT_SELECT);
    this.assertRequestScope(request, user);

    // Idempotent: approving anything already decided is refused rather than
    // silently re-billing.
    if (request.status !== MembershipRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_REQUEST_ALREADY_DECIDED'),
      );
    }

    const member = request.user;
    const feeRows = await this.loadFeeRows();
    const quote = quoteMembership(
      {
        provinceId: member.province
          ? idToString(member.province) || null
          : null,
        currentType:
          member.status === UserStatus.ACTIVE
            ? (member.membershipType ?? null)
            : null,
        entranceSettled: !!member.entranceFeeSettledAt,
      },
      request.type,
      feeRows,
    );

    // Freeze the entire quote onto the request so a later price edit cannot move
    // a bill that has already been issued.
    request.fee = quote.fee;
    request.creditType = quote.creditType as MembershipType;
    request.creditApplied = quote.creditApplied;
    request.entranceFee = quote.entranceFee;
    request.amountDue = quote.amountDue;
    request.rejectionReason = undefined as unknown as string;

    if (quote.amountDue > 0) {
      request.status = MembershipRequestStatus.AWAITING_PAYMENT;
      request.paymentStatus = PaymentStatus.PENDING;
      request.decidedAt = new Date();
      await request.save();
      return this.findRequestById(id, user);
    }

    // Nothing owed: snapshot the (zero) bill and activate immediately.
    await request.save();
    await this.activationService.activate(request._id.toString());
    return this.findRequestById(id, user);
  }

  async reject(
    id: string,
    dto: RejectMembershipRequestDto,
    user?: AuthenticatedUser,
  ): Promise<MembershipRequest> {
    const request = await this.loadRequest(id, APPLICANT_SELECT);
    this.assertRequestScope(request, user);

    if (request.status !== MembershipRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_REQUEST_ALREADY_DECIDED'),
      );
    }

    request.status = MembershipRequestStatus.REJECTED;
    request.decidedAt = new Date();
    if (dto?.reason && dto.reason.trim()) {
      request.rejectionReason = dto.reason.trim();
    }
    await request.save();

    // A first-time applicant is refused outright; a tier-change request from an
    // active member leaves the member on their existing tier.
    const member = await this.userModel.findById(request.user).exec();
    if (member && member.status !== UserStatus.ACTIVE) {
      member.status = UserStatus.REJECTED;
      if (dto?.reason && dto.reason.trim()) {
        member.rejectionReason = dto.reason.trim();
      }
      await member.save();
    }

    return this.findRequestById(id, user);
  }

  async markPaid(
    id: string,
    dto: MarkPaidMembershipRequestDto,
    admin: AuthenticatedUser,
  ): Promise<MembershipRequest> {
    const request = await this.loadRequest(id, APPLICANT_SELECT);
    this.assertRequestScope(request, admin);

    if (
      request.status !== MembershipRequestStatus.AWAITING_PAYMENT ||
      request.paymentStatus !== PaymentStatus.PENDING
    ) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_AWAITING_PAYMENT'),
      );
    }

    const now = new Date();

    // Conditional claim: only one settlement can flip a still-payable request,
    // so a double confirmation cannot record two payments.
    const claim = await this.requestModel
      .updateOne(
        {
          _id: request._id,
          status: MembershipRequestStatus.AWAITING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
        },
        { $set: { paymentStatus: PaymentStatus.PAID, paidAt: now } },
      )
      .exec();

    if (claim.modifiedCount === 0) {
      throw new BadRequestException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_AWAITING_PAYMENT'),
      );
    }

    const member = request.user;

    // Ledger row — the single source of truth for money collected.
    await this.paymentModel.create({
      amount: request.amountDue,
      source: PaymentSource.MEMBERSHIP,
      sourceId: request._id,
      user: member?._id ?? request.user,
      province: member?.province,
      membershipType: request.type,
      method: PaymentMethod.OFFLINE,
      reference: dto?.reference?.trim(),
      confirmedBy: new Types.ObjectId(admin.id),
      paidAt: now,
      note: dto?.note?.trim(),
    });

    await this.activationService.activate(request._id.toString());
    return this.findRequestById(id, admin);
  }

  // --- Fees -----------------------------------------------------------------

  async findAllFees(): Promise<MembershipFee[]> {
    return this.feeModel.find().sort({ type: 1 }).exec();
  }

  async updateFee(
    type: MembershipType,
    dto: UpdateMembershipFeeDto,
  ): Promise<MembershipFee> {
    const fee = await this.feeModel
      .findOneAndUpdate(
        { type },
        {
          $set: {
            baseFee: dto.baseFee,
            entranceFee: dto.entranceFee ?? 0,
          },
          $setOnInsert: { type },
        },
        { new: true, upsert: true },
      )
      .exec();

    return fee;
  }

  async setProvincePrices(
    type: MembershipType,
    dto: SetProvincePricesDto,
  ): Promise<MembershipFee> {
    const prices = (dto.prices ?? [])
      // A blank annual fee removes the override entirely (fall back to base).
      .filter((p) => p.fee !== null && p.fee !== undefined)
      .map((p) => ({
        province: new Types.ObjectId(p.province),
        fee: p.fee as number,
        // A blank entrance override means "use the national amount", stored as
        // absent rather than 0.
        ...(p.entranceFee !== null && p.entranceFee !== undefined
          ? { entranceFee: p.entranceFee }
          : {}),
      }));

    const fee = await this.feeModel
      .findOneAndUpdate(
        { type },
        { $set: { prices }, $setOnInsert: { type } },
        { new: true, upsert: true },
      )
      .exec();

    return fee;
  }

  // --- Tier copy ------------------------------------------------------------

  async findAllTypeInfo(): Promise<MembershipTypeInfo[]> {
    return this.typeInfoModel.find().sort({ type: 1 }).exec();
  }

  async saveTypeInfo(
    type: MembershipType,
    dto: UpdateMembershipTypeInfoDto,
  ): Promise<MembershipTypeInfo> {
    if (!dto.summary?.en || !dto.summary.en.trim()) {
      throw new BadRequestException(
        translate('validation.IS_NOT_EMPTY', { property: 'summary.en' }),
      );
    }

    const summary = {
      en: dto.summary.en.trim(),
      fa: dto.summary.fa?.trim(),
    };

    // Rich text is sanitised on write, not left to render-time escaping.
    const rights = {
      en: sanitizeHtml(dto.rights?.en),
      fa: dto.rights?.fa ? sanitizeHtml(dto.rights.fa) : undefined,
    };

    const info = await this.typeInfoModel
      .findOneAndUpdate(
        { type },
        { $set: { summary, rights }, $setOnInsert: { type } },
        { new: true, upsert: true },
      )
      .exec();

    return info;
  }

  async seed(): Promise<{ fees: number; typeInfos: number }> {
    let fees = 0;
    let typeInfos = 0;

    for (const type of Object.values(MembershipType)) {
      const feeRes = await this.feeModel
        .updateOne(
          { type },
          { $setOnInsert: { type, baseFee: 0, entranceFee: 0, prices: [] } },
          { upsert: true },
        )
        .exec();
      if (feeRes.upsertedCount > 0) fees++;

      const infoRes = await this.typeInfoModel
        .updateOne({ type }, { $setOnInsert: { type } }, { upsert: true })
        .exec();
      if (infoRes.upsertedCount > 0) typeInfos++;
    }

    return { fees, typeInfos };
  }

  // --- helpers --------------------------------------------------------------

  private async loadRequest(
    id: string,
    applicantSelect?: string,
  ): Promise<MembershipRequest> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_FOUND'),
      );
    }

    const query = this.requestModel
      .findById(id)
      .select(MembershipRequestProp.admin);
    if (applicantSelect) {
      query.populate('user', applicantSelect);
    }

    const request = await query.exec();
    if (!request) {
      throw new NotFoundException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_FOUND'),
      );
    }
    return request;
  }

  /**
   * Resolves the set of applicant ids a query is scoped to, or `null` when there
   * is no applicant constraint at all. Combines province-admin scoping, the
   * optional province filter, and the free-text search.
   */
  private async resolveApplicantIds(
    query?: AdminListMembershipRequestsDto,
    user?: AuthenticatedUser,
  ): Promise<Types.ObjectId[] | null> {
    const userFilter: QueryFilter<User> = {};
    let constrained = false;

    // Province-admin scope.
    const scopeProvinces = this.scopedProvinceIds(user);
    if (scopeProvinces) {
      userFilter.province = { $in: scopeProvinces };
      constrained = true;
    }

    // Explicit province filter (intersect with scope when both present).
    if (query?.province && isValidObjectId(query.province)) {
      const provinceId = new Types.ObjectId(query.province);
      if (scopeProvinces && !scopeProvinces.some((p) => p.equals(provinceId))) {
        // Requested a province outside the admin's scope: no results.
        return [];
      }
      userFilter.province = provinceId;
      constrained = true;
    }

    // Free-text search over applicant identity fields.
    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      userFilter.$or = [
        { fullName: regex },
        { mobile: regex },
        { nationalCode: regex },
        { email: regex },
      ];
      constrained = true;
    }

    if (!constrained) return null;

    const users = await this.userModel.find(userFilter).select('_id').exec();
    return users.map((u) => u._id);
  }

  /**
   * The provinces a province-scoped admin is limited to, or `null` for an admin
   * with global scope (SUPER_ADMIN / ADMIN).
   */
  private scopedProvinceIds(user?: AuthenticatedUser): Types.ObjectId[] | null {
    if (!user) return null;

    const isGlobal = user.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (isGlobal) return null;

    if (
      user.roles?.includes(UserRole.PROVINCE_ADMIN) &&
      user.managedProvinces &&
      user.managedProvinces.length > 0
    ) {
      return user.managedProvinces
        .filter((p) => isValidObjectId(p))
        .map((p) => new Types.ObjectId(p));
    }

    return null;
  }

  /**
   * Asserts a province-scoped admin may act on a request, based on the
   * applicant's province.
   */
  private assertRequestScope(
    request: MembershipRequest,
    user?: AuthenticatedUser,
  ): void {
    const scopeProvinces = this.scopedProvinceIds(user);
    if (!scopeProvinces) return;

    const member = request.user as unknown as User | undefined;
    const provinceId = member?.province ? idToString(member.province) : null;

    if (
      !provinceId ||
      !scopeProvinces.some((p) => p.toString() === provinceId)
    ) {
      throw new ForbiddenException(
        translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
      );
    }
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

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  DocumentRequest,
  DocumentRequestProp,
  DocumentRequestStatus,
} from '../document-request.schema';
import {
  MEMBERSHIP_CARD_SLUG,
  RequestType,
  RequestTypeProp,
} from '../../request-type/request-type.schema';
import { User, UserProp, UserRole } from '../../user/user.schema';
import {
  Payment,
  PaymentKind,
  PaymentMethod,
  PaymentSource,
} from '../../payment/payment.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import { toMediaFile } from '../../../common/utils/media-file.util';
import { AuthenticatedUser } from '../../auth/types';
import { idToString } from '../utils/document-request-pricing.util';
import {
  IDocumentRequestAdminService,
  PaginatedAdminDocumentRequests,
} from '../interfaces/document-request-admin-service.interface';
import { AdminListDocumentRequestsDto } from '../dtos/admin-list-document-requests.dto';
import { RejectDocumentRequestDto } from '../dtos/reject-document-request.dto';
import { FulfillDocumentRequestDto } from '../dtos/fulfill-document-request.dto';
import { MarkPaidDocumentRequestDto } from '../dtos/mark-paid-document-request.dto';

/**
 * Administrative Document Request Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative review, provincial scoping, payment confirmation,
 * document fulfillment, and request lifecycle management.
 */
@Injectable()
export class DocumentRequestAdminService implements IDocumentRequestAdminService {
  constructor(
    @InjectModel(DocumentRequest.name)
    private readonly documentRequestModel: Model<DocumentRequest>,
    @InjectModel(RequestType.name)
    private readonly requestTypeModel: Model<RequestType>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
  ) {}

  /**
   * Lists document requests with pagination, status, request type, province,
   * search, and attention filters. Scopes results for PROVINCE_ADMIN.
   */
  async findAll(
    query?: AdminListDocumentRequestsDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedAdminDocumentRequests> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<DocumentRequest> = {};

    // 1. Attention filter vs Status filter
    if (query?.attention) {
      filter.$or = [
        { status: DocumentRequestStatus.PENDING },
        {
          status: DocumentRequestStatus.ACCEPTED,
          paymentStatus: { $ne: PaymentStatus.PENDING },
        },
      ];
    } else if (query?.status) {
      filter.status = query.status;
    }

    // 2. Request type filter
    if (query?.requestType) {
      filter.requestType = new Types.ObjectId(query.requestType);
    }

    // 3. Provincial scoping & Province query filter
    const isSuper = admin?.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    const isProvinceAdmin = admin?.roles?.includes(UserRole.PROVINCE_ADMIN);

    const managedProvinceIds =
      isProvinceAdmin && !isSuper && admin?.managedProvinces
        ? admin.managedProvinces.map((p) => idToString(p))
        : undefined;

    let targetProvinceIds: string[] | undefined;
    if (query?.province) {
      const qProvince = idToString(query.province);
      if (managedProvinceIds && !managedProvinceIds.includes(qProvince)) {
        // Requested province is outside admin's managed scope
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      targetProvinceIds = [qProvince];
    } else if (managedProvinceIds) {
      targetProvinceIds = managedProvinceIds;
    }

    // 4. Search and/or user-scoped filtering
    const hasSearch = !!(query?.search && query.search.trim());
    if (targetProvinceIds || hasSearch) {
      const userFilter: QueryFilter<User> = {};

      if (targetProvinceIds) {
        userFilter.province = {
          $in: targetProvinceIds.map((p) => new Types.ObjectId(p)),
        };
      }

      if (hasSearch && query?.search) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        userFilter.$or = [
          { fullName: regex },
          { latinFullName: regex },
          { mobile: regex },
          { nationalCode: regex },
        ];
      }

      const matchingUsers = await this.userModel
        .find(userFilter)
        .select('_id')
        .exec();

      const userIds = matchingUsers.map((u) => u._id);

      if (hasSearch && !targetProvinceIds && query?.search) {
        const escaped = query.search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const noteRegex = new RegExp(escaped, 'i');

        // Match either user search or request note search
        if (filter.$or) {
          filter.$and = [
            { $or: filter.$or },
            {
              $or: [{ user: { $in: userIds } }, { note: noteRegex }],
            },
          ];
          delete filter.$or;
        } else {
          filter.$or = [{ user: { $in: userIds } }, { note: noteRegex }];
        }
      } else {
        filter.user = { $in: userIds };
      }
    }

    const [data, total] = await Promise.all([
      this.documentRequestModel
        .find(filter)
        .select(DocumentRequestProp.admin)
        .populate('user', UserProp.admin)
        .populate('requestType', RequestTypeProp.admin)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.documentRequestModel.countDocuments(filter).exec(),
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
   * Retrieves any document request by ID, verifying province scope.
   */
  async findById(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findById(id)
      .select(DocumentRequestProp.admin)
      .populate('user', UserProp.admin)
      .populate('requestType', RequestTypeProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    return request;
  }

  /**
   * Accepts a pending document request, moving status to ACCEPTED
   * and setting paymentStatus to PENDING (if fee > 0) or NONE (if fee === 0).
   */
  async accept(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findById(id)
      .populate('user', UserProp.admin)
      .populate('requestType', RequestTypeProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    if (request.status !== DocumentRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_PENDING'),
      );
    }

    request.status = DocumentRequestStatus.ACCEPTED;
    request.paymentStatus =
      request.fee > 0 ? PaymentStatus.PENDING : PaymentStatus.NONE;
    request.rejectionReason = undefined as unknown as string;

    await request.save();
    return request;
  }

  /**
   * Rejects a pending document request with an optional or required reason.
   */
  async reject(
    id: string,
    dto: RejectDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findById(id)
      .populate('user', UserProp.admin)
      .populate('requestType', RequestTypeProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    if (request.status !== DocumentRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_PENDING'),
      );
    }

    request.status = DocumentRequestStatus.REJECTED;
    request.rejectionReason =
      dto.reason?.trim() || (undefined as unknown as string);

    await request.save();
    return request;
  }

  /**
   * Fulfills an accepted document request by uploading/attaching the issued file
   * (or completing directly if non-document). Blocks if awaiting payment or
   * if membership card (cards are generated, not fulfilled manually).
   */
  async fulfill(
    id: string,
    dto: FulfillDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findById(id)
      .populate('user', UserProp.admin)
      .populate('requestType', RequestTypeProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    if (request.status !== DocumentRequestStatus.ACCEPTED) {
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_ACCEPTED'),
      );
    }

    if (request.paymentStatus === PaymentStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_AWAITING_PAYMENT'),
      );
    }

    const requestType = request.requestType;
    if (requestType?.slug === MEMBERSHIP_CARD_SLUG) {
      throw new BadRequestException(
        translate('errors.CARD_REQUEST_MANUAL_FULFILL_DISALLOWED'),
      );
    }

    if (requestType?.producesDocument) {
      if (!dto?.file?.key?.trim()) {
        throw new BadRequestException(
          translate('errors.DOCUMENT_FILE_REQUIRED'),
        );
      }
      request.issuedFile = toMediaFile(dto.file);
    }

    request.status = DocumentRequestStatus.COMPLETED;
    await request.save();
    return request;
  }

  /**
   * Confirms an offline payment (bank receipt / cash) for an accepted document request,
   * transitions paymentStatus to PAID, and writes an entry in the Payment ledger.
   */
  async markPaid(
    id: string,
    dto: MarkPaidDocumentRequestDto,
    admin?: AuthenticatedUser,
  ): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findById(id)
      .populate('user', UserProp.admin)
      .populate('requestType', RequestTypeProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    if (request.status !== DocumentRequestStatus.ACCEPTED) {
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_ACCEPTED'),
      );
    }

    if (request.paymentStatus !== PaymentStatus.PENDING) {
      if (request.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException(
          translate('errors.DOCUMENT_REQUEST_ALREADY_PAID'),
        );
      }
      throw new BadRequestException(
        translate('errors.DOCUMENT_REQUEST_NOT_AWAITING_PAYMENT'),
      );
    }

    const user = request.user;
    const requestType = request.requestType;

    // Record settled payment in ledger
    await this.paymentModel.create({
      kind: PaymentKind.PAYMENT,
      amount: request.fee,
      source: PaymentSource.REQUEST,
      sourceId: request._id,
      user: user?._id ?? request.user,
      province: user?.province,
      requestType: requestType?._id ?? request.requestType,
      description: requestType?.name,
      method: PaymentMethod.OFFLINE,
      reference: dto?.reference?.trim(),
      confirmedBy: admin?.id ? new Types.ObjectId(admin.id) : undefined,
      paidAt: new Date(),
      note: dto?.note?.trim(),
    });

    request.paymentStatus = PaymentStatus.PAID;
    await request.save();
    return request;
  }

  /**
   * Deletes a document request.
   */
  async delete(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const request = await this.documentRequestModel
      .findById(id)
      .populate('user', UserProp.admin)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    this.assertProvinceScope(request.user?.province, admin);

    await this.documentRequestModel.findByIdAndDelete(id).exec();
    return { success: true };
  }

  /**
   * Asserts that if the admin is province-scoped (PROVINCE_ADMIN), they are authorized
   * for the user's province.
   */
  private assertProvinceScope(
    province: unknown,
    admin?: AuthenticatedUser,
  ): void {
    if (!admin) return;

    const isSuper = admin.roles?.some(
      (r) => r === UserRole.SUPER_ADMIN || r === UserRole.ADMIN,
    );
    if (isSuper) return;

    const isProvinceAdmin = admin.roles?.includes(UserRole.PROVINCE_ADMIN);
    if (isProvinceAdmin && admin.managedProvinces) {
      const userProvinceId = idToString(province);
      const managed = admin.managedProvinces.map((p) => idToString(p));
      if (!userProvinceId || !managed.includes(userProvinceId)) {
        throw new ForbiddenException(
          translate('errors.FORBIDDEN_PROVINCE_SCOPE'),
        );
      }
    }
  }
}

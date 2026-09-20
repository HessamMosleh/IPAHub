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
import { User, UserStatus } from '../../user/user.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { translate } from '../../../common/utils/translate';
import { resolveRequestPrice } from '../utils/document-request-pricing.util';
import { getCardBlockers } from '../utils/card-eligibility.util';
import {
  IDocumentRequestService,
  PaginatedUserDocumentRequests,
} from '../interfaces/document-request-service.interface';
import { CreateDocumentRequestDto } from '../dtos/create-document-request.dto';
import { ListDocumentRequestsDto } from '../dtos/list-document-requests.dto';
import {
  DocumentRequestOptionDto,
  DocumentRequestOptionsResponseDto,
} from '../dtos/document-request-options-response.dto';

/**
 * Public/Member Client Document Request Service.
 * Adheres to Single Responsibility Principle (SRP) — handles member actions:
 * exploring available document types with live quotes, submitting requests,
 * and reviewing personal request status.
 */
@Injectable()
export class DocumentRequestService implements IDocumentRequestService {
  constructor(
    @InjectModel(DocumentRequest.name)
    private readonly documentRequestModel: Model<DocumentRequest>,
    @InjectModel(RequestType.name)
    private readonly requestTypeModel: Model<RequestType>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Returns all active document request types with live member-specific pricing
   * and card blocker states.
   */
  async getOptions(userId: string): Promise<DocumentRequestOptionsResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const types = await this.requestTypeModel
      .find({ status: ActiveStatus.ACTIVE })
      .sort({ order: 1, createdAt: 1 })
      .exec();

    const blockers = getCardBlockers(user);

    const options: DocumentRequestOptionDto[] = types.map((t) => {
      const isCard = t.slug === MEMBERSHIP_CARD_SLUG;
      const fee = resolveRequestPrice(t, user.province);
      const disabled = isCard && blockers.length > 0;

      return {
        id: t._id.toString(),
        slug: t.slug,
        name: t.name,
        description: t.description,
        fee,
        producesDocument: t.producesDocument,
        disabled,
        blockers: isCard ? blockers : [],
      };
    });

    return { options };
  }

  /**
   * Submits a document request as an active member.
   * Enforces active membership, validates request type availability,
   * performs card blocker verification if requesting a membership card,
   * snapshots the fee, and initializes status as PENDING.
   */
  async create(
    dto: CreateDocumentRequestDto,
    userId: string,
  ): Promise<DocumentRequest> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(translate('errors.MEMBERSHIP_NOT_ACTIVE'));
    }

    const type = await this.requestTypeModel.findById(dto.requestType).exec();
    if (!type) {
      throw new NotFoundException(translate('errors.REQUEST_TYPE_NOT_FOUND'));
    }

    if (type.status !== ActiveStatus.ACTIVE) {
      throw new BadRequestException(translate('errors.REQUEST_TYPE_INACTIVE'));
    }

    if (type.slug === MEMBERSHIP_CARD_SLUG) {
      const blockers = getCardBlockers(user);
      if (blockers.length > 0) {
        if (blockers.includes('photo')) {
          throw new BadRequestException(
            translate('errors.CARD_PHOTO_REQUIRED'),
          );
        }
        if (blockers.includes('latinName')) {
          throw new BadRequestException(
            translate('errors.CARD_LATIN_NAME_REQUIRED'),
          );
        }
        if (blockers.includes('membershipType')) {
          throw new BadRequestException(
            translate('errors.CARD_MEMBERSHIP_TYPE_REQUIRED'),
          );
        }
        if (blockers.includes('membershipNo')) {
          throw new BadRequestException(
            translate('errors.CARD_MEMBERSHIP_NO_REQUIRED'),
          );
        }
        throw new BadRequestException(
          translate('errors.CARD_PROFILE_INCOMPLETE'),
        );
      }
    }

    const fee = resolveRequestPrice(type, user.province);

    const docRequest = await this.documentRequestModel.create({
      user: user._id,
      requestType: type._id,
      note: dto.note?.trim() || undefined,
      fee,
      status: DocumentRequestStatus.PENDING,
      paymentStatus: PaymentStatus.NONE,
      createdAt: new Date(),
    });

    return this.documentRequestModel
      .findById(docRequest._id)
      .select(DocumentRequestProp.general)
      .populate('requestType', RequestTypeProp.general)
      .exec() as unknown as DocumentRequest;
  }

  /**
   * Retrieves paginated document requests for the authenticated member.
   */
  async findAllByUser(
    userId: string,
    query?: ListDocumentRequestsDto,
  ): Promise<PaginatedUserDocumentRequests> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<DocumentRequest> = {
      user: new Types.ObjectId(userId),
    };

    if (query?.status) {
      filter.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.documentRequestModel
        .find(filter)
        .select(DocumentRequestProp.general)
        .populate('requestType', RequestTypeProp.general)
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
   * Retrieves a single document request by ID for the requesting member.
   */
  async findByIdAndUser(id: string, userId: string): Promise<DocumentRequest> {
    const request = await this.documentRequestModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(DocumentRequestProp.general)
      .populate('requestType', RequestTypeProp.general)
      .exec();

    if (!request) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    return request;
  }
}

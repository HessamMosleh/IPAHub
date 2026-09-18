import {
  BadRequestException,
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
import { User } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { AdminListCooperationRequestsDto } from '../dtos/admin-list-cooperation-requests.dto';
import { DeclineCooperationRequestDto } from '../dtos/decline-cooperation-request.dto';
import {
  ICooperationAdminService,
  PaginatedCooperationRequests,
} from '../interfaces/cooperation-admin-service.interface';

/**
 * Administrative Cooperation Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative queries, filtering, review decisions (accept/decline),
 * and record management.
 */
@Injectable()
export class CooperationAdminService implements ICooperationAdminService {
  constructor(
    @InjectModel(CooperationRequest.name)
    private readonly cooperationRequestModel: Model<CooperationRequest>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Lists cooperation requests with pagination, status, province, and search filters.
   */
  async findAll(
    query?: AdminListCooperationRequestsDto,
  ): Promise<PaginatedCooperationRequests> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<CooperationRequest> = {};

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.province && isValidObjectId(query.province)) {
      filter.province = new Types.ObjectId(query.province);
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const matchingUsers = await this.userModel
        .find({
          $or: [
            { fullName: regex },
            { mobile: regex },
            { nationalCode: regex },
            { email: regex },
          ],
        })
        .select('_id')
        .exec();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { user: { $in: userIds } },
        { city: regex },
        { description: regex },
        { postalAddress: regex },
        { postalCode: regex },
        { telephone: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.cooperationRequestModel
        .find(filter)
        .select(CooperationRequestProp.admin)
        .populate('user', 'fullName mobile nationalCode email')
        .populate('province', 'slug name')
        .sort({ status: 1, createdAt: -1 })
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
   * Retrieves any cooperation request by id with populated member and province details.
   */
  async findById(id: string): Promise<CooperationRequest> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    const request = await this.cooperationRequestModel
      .findById(id)
      .select(CooperationRequestProp.admin)
      .populate('user', 'fullName mobile nationalCode email')
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
   * Accepts a pending cooperation request. Refuses already-decided requests.
   */
  async accept(id: string): Promise<CooperationRequest> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    const request = await this.cooperationRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    if (request.status !== CooperationRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.COOPERATION_REQUEST_ALREADY_DECIDED'),
      );
    }

    request.status = CooperationRequestStatus.ACCEPTED;
    request.decidedAt = new Date();
    request.rejectionReason = undefined;
    await request.save();

    return this.findById(id);
  }

  /**
   * Declines a pending cooperation request with a required reason. Refuses already-decided requests.
   */
  async decline(
    id: string,
    dto: DeclineCooperationRequestDto,
  ): Promise<CooperationRequest> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    if (!dto?.reason || !dto.reason.trim()) {
      throw new BadRequestException(
        translate('errors.REJECTION_REASON_REQUIRED'),
      );
    }

    const request = await this.cooperationRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    if (request.status !== CooperationRequestStatus.PENDING) {
      throw new BadRequestException(
        translate('errors.COOPERATION_REQUEST_ALREADY_DECIDED'),
      );
    }

    request.status = CooperationRequestStatus.REJECTED;
    request.rejectionReason = dto.reason.trim();
    request.decidedAt = new Date();
    await request.save();

    return this.findById(id);
  }

  /**
   * Deletes a cooperation request by id.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    const res = await this.cooperationRequestModel.findByIdAndDelete(id).exec();
    if (!res) {
      throw new NotFoundException(
        translate('errors.COOPERATION_REQUEST_NOT_FOUND'),
      );
    }

    return { success: true };
  }
}

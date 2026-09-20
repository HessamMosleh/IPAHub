import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter, Types } from 'mongoose';
import { MemberFeedback, MemberFeedbackProp } from '../member-feedback.schema';
import { User, UserStatus } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { CreateFeedbackDto } from '../dtos/create-feedback.dto';
import { ListFeedbackDto } from '../dtos/list-feedback.dto';
import {
  IFeedbackService,
  PaginatedFeedback,
} from '../interfaces/feedback-service.interface';

/**
 * Public/Member Client Feedback Service.
 * Follows Single Responsibility Principle (SRP) — handles feedback submission
 * and member self-service inquiries. Restricted to active members only.
 */
@Injectable()
export class FeedbackService implements IFeedbackService {
  constructor(
    @InjectModel(MemberFeedback.name)
    private readonly feedbackModel: Model<MemberFeedback>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Submits a feedback message as an authenticated member.
   * Enforces that the user exists and has an active membership status.
   */
  async create(
    dto: CreateFeedbackDto,
    userId: string,
  ): Promise<MemberFeedback> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(translate('errors.MEMBERSHIP_NOT_ACTIVE'));
    }

    const feedback = new this.feedbackModel({
      user: new Types.ObjectId(userId),
      subject: dto.subject?.trim() || undefined,
      body: dto.body.trim(),
      resolved: false,
    });

    return feedback.save();
  }

  /**
   * Retrieves paginated feedback messages submitted by the current authenticated member.
   */
  async findAllByUser(
    userId: string,
    query?: ListFeedbackDto,
  ): Promise<PaginatedFeedback> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<MemberFeedback> = {
      user: new Types.ObjectId(userId),
    };

    if (query?.resolved !== undefined) {
      filter.resolved = query.resolved;
    }

    const [data, total] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .select(MemberFeedbackProp.general)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.feedbackModel.countDocuments(filter).exec(),
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
   * Retrieves a single feedback message by its ID, ensuring it belongs to the authenticated member.
   */
  async findByIdAndUser(id: string, userId: string): Promise<MemberFeedback> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    const feedback = await this.feedbackModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(MemberFeedbackProp.general)
      .exec();

    if (!feedback) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    return feedback;
  }
}

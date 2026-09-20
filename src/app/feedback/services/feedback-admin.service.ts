import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { MemberFeedback } from '../member-feedback.schema';
import { User } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import { AdminListFeedbackDto } from '../dtos/admin-list-feedback.dto';
import { PaginatedFeedback } from '../interfaces/feedback-service.interface';
import { IFeedbackAdminService } from '../interfaces/feedback-admin-service.interface';

/**
 * Administrative Feedback Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative inbox querying, resolving/unresolving,
 * deletion, and unresolved counter.
 */
@Injectable()
export class FeedbackAdminService implements IFeedbackAdminService {
  constructor(
    @InjectModel(MemberFeedback.name)
    private readonly feedbackModel: Model<MemberFeedback>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Lists all member feedback messages with pagination, status filter, and optional search.
   * Sorts unresolved items first, then by descending creation time.
   */
  async findAll(query?: AdminListFeedbackDto): Promise<PaginatedFeedback> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<MemberFeedback> = {};

    if (query?.resolved !== undefined) {
      filter.resolved = query.resolved;
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
            { latinFullName: regex },
            { mobile: regex },
            { nationalCode: regex },
          ],
        })
        .select('_id')
        .exec();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { subject: regex },
        { body: regex },
        ...(userIds.length > 0 ? [{ user: { $in: userIds } }] : []),
      ];
    }

    const [data, total] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .populate({
          path: 'user',
          select: 'fullName latinFullName mobile nationalCode province',
        })
        .sort({ resolved: 1, createdAt: -1 })
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
   * Retrieves a feedback message by its MongoDB ObjectId, populating sender details.
   */
  async findById(id: string): Promise<MemberFeedback> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    const feedback = await this.feedbackModel
      .findById(id)
      .populate({
        path: 'user',
        select: 'fullName latinFullName mobile nationalCode province',
      })
      .exec();

    if (!feedback) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    return feedback;
  }

  /**
   * Marks a feedback message as resolved.
   */
  async resolve(id: string): Promise<MemberFeedback> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    const feedback = await this.feedbackModel.findById(id).exec();
    if (!feedback) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    feedback.resolved = true;
    await feedback.save();

    return this.findById(id);
  }

  /**
   * Reopens a feedback message (marks as unresolved).
   */
  async unresolve(id: string): Promise<MemberFeedback> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    const feedback = await this.feedbackModel.findById(id).exec();
    if (!feedback) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    feedback.resolved = false;
    await feedback.save();

    return this.findById(id);
  }

  /**
   * Permanently deletes a feedback message.
   */
  async delete(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    const feedback = await this.feedbackModel.findById(id).exec();
    if (!feedback) {
      throw new NotFoundException(translate('errors.FEEDBACK_NOT_FOUND'));
    }

    await this.feedbackModel.deleteOne({ _id: id }).exec();
    return { success: true };
  }

  /**
   * Returns the count of unresolved (open) feedback messages.
   */
  async countUnresolved(): Promise<{ count: number }> {
    const count = await this.feedbackModel
      .countDocuments({ resolved: false })
      .exec();
    return { count };
  }
}

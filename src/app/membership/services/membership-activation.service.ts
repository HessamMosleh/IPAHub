import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { User, UserStatus } from '../../user/user.schema';
import { translate } from '../../../common/utils/translate';
import {
  MembershipRequest,
  MembershipRequestStatus,
} from '../schemas/membership-request.schema';
import { addOneYear, renewalStart } from '../utils/membership-term.util';

/** The first membership number ever handed out. Incremented, never reused. */
const MEMBERSHIP_NO_BASE = 1000;

/**
 * Shared membership activation.
 *
 * Extracted into its own service (SRP + DIP) because activation is the single
 * point every settlement path converges on — an admin approving a free tier, an
 * offline payment being confirmed, and a member renewing at zero cost all end
 * here, and must do exactly the same thing: stamp the term, assign a membership
 * number, settle the entrance fee once, and flip both the request and the member
 * to APPROVED.
 */
@Injectable()
export class MembershipActivationService {
  constructor(
    @InjectModel(MembershipRequest.name)
    private readonly requestModel: Model<MembershipRequest>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Activates the membership described by an approved/paid request. Idempotent:
   * a request already APPROVED is returned untouched.
   */
  async activate(requestId: string): Promise<MembershipRequest> {
    const request = await this.requestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException(
        translate('errors.MEMBERSHIP_REQUEST_NOT_FOUND'),
      );
    }

    if (request.status === MembershipRequestStatus.APPROVED) {
      return request;
    }

    const user = await this.userModel.findById(request.user).exec();
    if (!user) {
      throw new NotFoundException(translate('errors.USER_NOT_FOUND'));
    }

    const now = new Date();

    // Assign a membership number on first activation; never reissue one.
    if (user.membershipNo === undefined || user.membershipNo === null) {
      user.membershipNo = await this.nextMembershipNo();
    }

    // Term: HONORARY never expires; everyone else gets a year, extended from the
    // later of now and the existing expiry so early renewals keep their remainder.
    if (request.type === MembershipType.HONORARY) {
      user.membershipExpiresAt = null as unknown as Date;
    } else {
      user.membershipExpiresAt = addOneYear(
        renewalStart(now, user.membershipExpiresAt),
      );
    }

    // Entrance fee is settled once, ever — stamp it the first time a bill that
    // included it is paid.
    if (
      request.entranceFee > 0 &&
      (user.entranceFeeSettledAt === undefined ||
        user.entranceFeeSettledAt === null)
    ) {
      user.entranceFeeSettledAt = now;
    }

    user.membershipType = request.type;
    user.status = UserStatus.ACTIVE;
    user.rejectionReason = undefined as unknown as string;
    await user.save();

    request.status = MembershipRequestStatus.APPROVED;
    if (!request.decidedAt) {
      request.decidedAt = now;
    }
    await request.save();

    return request;
  }

  /**
   * The next membership number: one past the highest ever issued, or the base
   * when none exist yet. The unique sparse index on `membershipNo` is the final
   * guard against a collision under concurrency.
   */
  private async nextMembershipNo(): Promise<number> {
    const highest = await this.userModel
      .findOne({ membershipNo: { $ne: null } })
      .sort({ membershipNo: -1 })
      .select('membershipNo')
      .exec();

    return highest?.membershipNo
      ? highest.membershipNo + 1
      : MEMBERSHIP_NO_BASE;
  }
}

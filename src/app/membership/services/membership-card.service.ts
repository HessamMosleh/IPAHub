import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MembershipCard,
  MembershipCardProp,
} from '../schemas/membership-card.schema';
import {
  DocumentRequest,
  DocumentRequestStatus,
} from '../../document-request/document-request.schema';
import {
  MEMBERSHIP_CARD_SLUG,
  RequestType,
} from '../../request-type/request-type.schema';
import { User } from '../../user/user.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { MediaFile } from '../../../common/schemas/media-file.schema';
import { translate } from '../../../common/utils/translate';
import { IMembershipCardService } from '../interfaces/membership-card-service.interface';
import {
  buildCardData,
  formatCardDate,
  toPersianDigits,
} from '../utils/membership-card-data.util';
import {
  buildCardSvg,
  CARD_H,
  CARD_W,
  CardSide,
  paletteFor,
} from '../utils/membership-card-svg.util';

@Injectable()
export class MembershipCardService implements IMembershipCardService {
  constructor(
    @InjectModel(MembershipCard.name)
    private readonly membershipCardModel: Model<MembershipCard>,
    @InjectModel(DocumentRequest.name)
    private readonly documentRequestModel: Model<DocumentRequest>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(RequestType.name)
    private readonly requestTypeModel: Model<RequestType>,
  ) {}

  /**
   * Generates and snapshots a membership card for a paid, accepted document request,
   * then transitions the request status to COMPLETED.
   *
   * Idempotent — subsequent calls without { force: true } return the existing card.
   * Throws if prerequisite profile attributes (photo, names, tier, membershipNo) are missing.
   */
  async issueCard(
    requestId: string,
    opts: { force?: boolean } = {},
  ): Promise<MembershipCard | null> {
    const request = await this.documentRequestModel
      .findById(requestId)
      .populate('requestType')
      .populate('user')
      .exec();

    if (!request) return null;

    const requestType = request.requestType;
    if (!requestType || requestType.slug !== MEMBERSHIP_CARD_SLUG) {
      return null;
    }

    const existing = await this.membershipCardModel
      .findOne({ request: request._id })
      .exec();

    if (existing && !opts.force) {
      return existing;
    }

    if (
      request.status === DocumentRequestStatus.REJECTED ||
      request.status === DocumentRequestStatus.PENDING
    ) {
      return null;
    }

    if (request.paymentStatus === PaymentStatus.PENDING) {
      return null;
    }

    const user = request.user;
    if (!user) {
      throw new BadRequestException(translate('errors.USER_NOT_FOUND'));
    }
    if (!user.fullName?.trim()) {
      throw new BadRequestException(
        translate('errors.CARD_PROFILE_INCOMPLETE'),
      );
    }
    if (!user.latinFullName?.trim()) {
      throw new BadRequestException(
        translate('errors.CARD_LATIN_NAME_REQUIRED'),
      );
    }
    if (!user.membershipType) {
      throw new BadRequestException(
        translate('errors.CARD_MEMBERSHIP_TYPE_REQUIRED'),
      );
    }
    if (user.membershipNo === undefined || user.membershipNo === null) {
      throw new BadRequestException(
        translate('errors.CARD_MEMBERSHIP_NO_REQUIRED'),
      );
    }
    if (!user.photo?.key?.trim()) {
      throw new BadRequestException(translate('errors.CARD_PHOTO_REQUIRED'));
    }

    const issuedAt = new Date();
    const cardData = buildCardData({
      fullName: user.fullName,
      latinName: user.latinFullName,
      nationalCode: user.nationalCode,
      membershipNo: user.membershipNo,
      membershipType: user.membershipType,
      education: {
        educationLevel: user.educationLevel,
        fieldOfStudy: user.fieldOfStudy,
      },
      issuedAt,
      membershipExpiresAt: user.membershipExpiresAt,
    });

    const frontImage: MediaFile = {
      key: `cards/membership-card-${requestId}-front.png`,
      mimeType: 'image/png',
      originalName: `membership-card-${requestId}-front.png`,
      width: CARD_W,
      height: CARD_H,
      uploadedAt: issuedAt,
    };

    const backImage: MediaFile = {
      key: `cards/membership-card-${requestId}-back.png`,
      mimeType: 'image/png',
      originalName: `membership-card-${requestId}-back.png`,
      width: CARD_W,
      height: CARD_H,
      uploadedAt: issuedAt,
    };

    const snapshot = {
      request: request._id,
      user: user._id,
      frontImage,
      backImage,
      membershipType: cardData.membershipType,
      fullName: cardData.fullName,
      latinName: cardData.latinName || undefined,
      nationalCode: user.nationalCode,
      membershipNo: user.membershipNo,
      fieldOfStudy: cardData.fieldOfStudy || undefined,
      issuedAt,
      expiresAt: cardData.expiresAt,
    };

    const card = await this.membershipCardModel
      .findOneAndUpdate(
        { request: request._id },
        { $set: snapshot },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    request.status = DocumentRequestStatus.COMPLETED;
    await request.save();

    return card;
  }

  async findByRequestId(requestId: string): Promise<MembershipCard | null> {
    return this.membershipCardModel
      .findOne({ request: new Types.ObjectId(requestId) })
      .select(MembershipCardProp.general)
      .exec();
  }

  async findByUserId(userId: string): Promise<MembershipCard[]> {
    return this.membershipCardModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ issuedAt: -1 })
      .select(MembershipCardProp.general)
      .exec();
  }

  async findLatestByUserId(userId: string): Promise<MembershipCard | null> {
    return this.membershipCardModel
      .findOne({ user: new Types.ObjectId(userId) })
      .sort({ issuedAt: -1 })
      .select(MembershipCardProp.general)
      .exec();
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<MembershipCard | null> {
    return this.membershipCardModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .select(MembershipCardProp.general)
      .exec();
  }

  async findById(id: string): Promise<MembershipCard | null> {
    return this.membershipCardModel
      .findById(id)
      .select(MembershipCardProp.admin)
      .populate('user')
      .exec();
  }

  async findAll(): Promise<MembershipCard[]> {
    return this.membershipCardModel
      .find()
      .sort({ issuedAt: -1 })
      .select(MembershipCardProp.admin)
      .populate('user')
      .exec();
  }

  async getCardSvg(requestId: string, side: CardSide): Promise<string> {
    const card = await this.membershipCardModel
      .findOne({ request: new Types.ObjectId(requestId) })
      .populate('user')
      .exec();

    if (!card) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }

    const user = card.user;
    const photoDataUri = user?.photo?.key
      ? `data:${user.photo.mimeType || 'image/jpeg'};base64,...`
      : null;

    return buildCardSvg({
      side,
      data: {
        fullName: card.fullName,
        latinName: card.latinName,
        nationalCodeText: toPersianDigits(card.nationalCode),
        membershipNoText: toPersianDigits(card.membershipNo),
        fieldOfStudy: card.fieldOfStudy,
        expiresAt: card.expiresAt,
        expiresAtText: formatCardDate(card.expiresAt),
        membershipType: card.membershipType,
      },
      palette: paletteFor(card.membershipType),
      logoDataUri: null,
      photoDataUri,
    });
  }
}

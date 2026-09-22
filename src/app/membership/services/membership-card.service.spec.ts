import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipCardService } from './membership-card.service';
import { MembershipCard } from '../schemas/membership-card.schema';
import {
  DocumentRequest,
  DocumentRequestStatus,
} from '../../document-request/document-request.schema';
import {
  MEMBERSHIP_CARD_SLUG,
  RequestType,
} from '../../request-type/request-type.schema';
import { EducationLevel, User } from '../../user/user.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import {
  buildDocumentRequest,
  buildDocumentRequestModelMock,
  buildQueryChain,
  buildRequestTypeModelMock,
  buildUserModelMock,
  FIXED_REQUEST_ID,
  FIXED_USER_ID,
} from '../../document-request/services/__test-helpers__/document-request-test-fixtures';
import { buildMembershipCardModelMock } from './__test-helpers__/membership-test-fixtures';

describe('MembershipCardService', () => {
  let service: MembershipCardService;
  let mockMembershipCardModel: ReturnType<typeof buildMembershipCardModelMock>;
  let mockDocRequestModel: ReturnType<typeof buildDocumentRequestModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockRequestTypeModel: ReturnType<typeof buildRequestTypeModelMock>;

  const validMember = {
    _id: FIXED_USER_ID,
    fullName: 'پروانه یزدان پناه',
    latinFullName: 'Parvaneh Yazdanpanah',
    nationalCode: '0499370899',
    membershipNo: 1016,
    membershipType: MembershipType.STUDENT,
    educationLevel: EducationLevel.MASTERS,
    fieldOfStudy: 'روان شناسی بالینی',
    photo: {
      key: 'portraits/user-123.jpg',
      mimeType: 'image/jpeg',
      width: 600,
      height: 800,
    },
    membershipExpiresAt: new Date('2028-01-01T00:00:00.000Z'),
  };

  const cardRequestType = {
    _id: '507f1f77bcf86cd799439033',
    slug: MEMBERSHIP_CARD_SLUG,
    name: { en: 'Membership Card' },
    producesDocument: true,
  };

  beforeEach(async () => {
    mockMembershipCardModel = buildMembershipCardModelMock();
    mockDocRequestModel = buildDocumentRequestModelMock();
    mockUserModel = buildUserModelMock();
    mockRequestTypeModel = buildRequestTypeModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipCardService,
        {
          provide: getModelToken(MembershipCard.name),
          useValue: mockMembershipCardModel,
        },
        {
          provide: getModelToken(DocumentRequest.name),
          useValue: mockDocRequestModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(RequestType.name),
          useValue: mockRequestTypeModel,
        },
      ],
    }).compile();

    service = module.get<MembershipCardService>(MembershipCardService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('issueCard', () => {
    it('snapshots the data, generates both sides, and completes the request', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      const expectedCard = {
        _id: 'card-123',
        request: request._id as string,
        user: validMember._id,
        fullName: validMember.fullName,
        latinName: validMember.latinFullName,
        nationalCode: validMember.nationalCode,
        membershipNo: validMember.membershipNo,
        fieldOfStudy: 'کارشناسی ارشد روان شناسی بالینی',
      };
      mockMembershipCardModel.findOneAndUpdate.mockReturnValue(
        buildQueryChain(expectedCard),
      );

      const result = await service.issueCard(FIXED_REQUEST_ID);

      expect(result).toBeDefined();
      const [filter, update] = mockMembershipCardModel.findOneAndUpdate.mock
        .calls[0] as unknown as [
        { request: string },
        {
          $set: {
            fullName: string;
            latinName: string;
            nationalCode: string;
            membershipNo: number;
            membershipType: MembershipType;
            fieldOfStudy: string;
            frontImage: { width: number; height: number; mimeType: string };
            backImage: { width: number; height: number; mimeType: string };
          };
        },
      ];
      expect(filter).toEqual({ request: request._id as string });
      expect(update.$set.fullName).toBe(validMember.fullName);
      expect(update.$set.latinName).toBe(validMember.latinFullName);
      expect(update.$set.nationalCode).toBe(validMember.nationalCode);
      expect(update.$set.membershipNo).toBe(validMember.membershipNo);
      expect(update.$set.membershipType).toBe(MembershipType.STUDENT);
      expect(update.$set.fieldOfStudy).toBe('کارشناسی ارشد روان شناسی بالینی');
      expect(update.$set.frontImage.width).toBe(1012);
      expect(update.$set.frontImage.height).toBe(638);
      expect(update.$set.frontImage.mimeType).toBe('image/png');
      expect(update.$set.backImage.width).toBe(1012);
      expect(update.$set.backImage.height).toBe(638);
      expect(update.$set.backImage.mimeType).toBe('image/png');

      expect(request.status).toBe(DocumentRequestStatus.COMPLETED);
      expect(request.save).toHaveBeenCalled();
    });

    it('issues a zero-fee card that never entered payment flow', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        fee: 0,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.NONE,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));
      mockMembershipCardModel.findOneAndUpdate.mockReturnValue(
        buildQueryChain({ _id: 'card-free' }),
      );

      const result = await service.issueCard(FIXED_REQUEST_ID);
      expect(result).toBeDefined();
      expect(request.status).toBe(DocumentRequestStatus.COMPLETED);
    });

    it('is idempotent — returns existing card without force', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      });

      const existingCard = { _id: 'card-existing' };
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(
        buildQueryChain(existingCard),
      );

      const result = await service.issueCard(FIXED_REQUEST_ID);

      expect(result).toBe(existingCard);
      expect(mockMembershipCardModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('re-renders in place when force is true', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
      });

      const existingCard = { _id: 'card-existing' };
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(
        buildQueryChain(existingCard),
      );
      mockMembershipCardModel.findOneAndUpdate.mockReturnValue(
        buildQueryChain({ _id: 'card-updated' }),
      );

      const result = await service.issueCard(FIXED_REQUEST_ID, {
        force: true,
      });

      expect(result).toEqual({ _id: 'card-updated' });
      expect(mockMembershipCardModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('skips a request that is still awaiting payment', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PENDING,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.issueCard(FIXED_REQUEST_ID);
      expect(result).toBeNull();
      expect(mockMembershipCardModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('skips a rejected request', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.REJECTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.issueCard(FIXED_REQUEST_ID);
      expect(result).toBeNull();
    });

    it('skips a request that is still pending approval', async () => {
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: cardRequestType,
        status: DocumentRequestStatus.PENDING,
        paymentStatus: PaymentStatus.NONE,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.issueCard(FIXED_REQUEST_ID);
      expect(result).toBeNull();
    });

    it('skips a request for any other type', async () => {
      const otherType = {
        _id: '507f1f77bcf86cd799439099',
        slug: 'bank-letter',
      };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: validMember,
        requestType: otherType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      const result = await service.issueCard(FIXED_REQUEST_ID);
      expect(result).toBeNull();
    });

    it('throws BadRequestException when user has no photo', async () => {
      const userWithoutPhoto = { ...validMember, photo: undefined };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: userWithoutPhoto,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.issueCard(FIXED_REQUEST_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(request.status).toBe(DocumentRequestStatus.ACCEPTED);
    });

    it('throws BadRequestException when user has no full name', async () => {
      const userWithoutName = { ...validMember, fullName: '' };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: userWithoutName,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.issueCard(FIXED_REQUEST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when user has no latin name', async () => {
      const userWithoutLatin = { ...validMember, latinFullName: '' };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: userWithoutLatin,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.issueCard(FIXED_REQUEST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when user has no membership type', async () => {
      const userWithoutTier = { ...validMember, membershipType: undefined };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: userWithoutTier,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.issueCard(FIXED_REQUEST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when user has no membership number', async () => {
      const userWithoutNo = { ...validMember, membershipNo: null };
      const request = buildDocumentRequest({
        _id: FIXED_REQUEST_ID,
        user: userWithoutNo,
        requestType: cardRequestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });

      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.issueCard(FIXED_REQUEST_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('query methods', () => {
    it('findByRequestId finds card by request ObjectId', async () => {
      const card = { _id: 'c1' };
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(card));

      const result = await service.findByRequestId(FIXED_REQUEST_ID);
      expect(result).toBe(card);
    });

    it('findByUserId lists cards sorted by issuedAt descending', async () => {
      const cards = [{ _id: 'c1' }, { _id: 'c2' }];
      mockMembershipCardModel.find.mockReturnValue(buildQueryChain(cards));

      const result = await service.findByUserId(FIXED_USER_ID);
      expect(result).toBe(cards);
    });

    it('findLatestByUserId finds latest card for user', async () => {
      const card = { _id: 'latest' };
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(card));

      const result = await service.findLatestByUserId(FIXED_USER_ID);
      expect(result).toBe(card);
    });

    it('findById finds card by MongoDB ObjectId', async () => {
      const card = { _id: 'c1' };
      mockMembershipCardModel.findById.mockReturnValue(buildQueryChain(card));

      const result = await service.findById('c1');
      expect(result).toBe(card);
    });

    it('findAll retrieves all cards', async () => {
      const cards = [{ _id: 'c1' }];
      mockMembershipCardModel.find.mockReturnValue(buildQueryChain(cards));

      const result = await service.findAll();
      expect(result).toBe(cards);
    });

    it('getCardSvg renders SVG string for side', async () => {
      const card = {
        _id: 'c1',
        fullName: 'پروانه یزدان پناه',
        latinName: 'Parvaneh Yazdanpanah',
        nationalCode: '0499370899',
        membershipNo: 1016,
        fieldOfStudy: 'کارشناسی ارشد روان شناسی بالینی',
        expiresAt: new Date('2027-07-30T12:00:00.000Z'),
        membershipType: MembershipType.STUDENT,
        user: validMember,
      };
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(card));

      const svg = await service.getCardSvg(FIXED_REQUEST_ID, 'front');
      expect(svg).toContain('<svg');
      expect(svg).toContain('پروانه یزدان پناه');
    });

    it('getCardSvg throws NotFoundException if card not found', async () => {
      mockMembershipCardModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.getCardSvg(FIXED_REQUEST_ID, 'front'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

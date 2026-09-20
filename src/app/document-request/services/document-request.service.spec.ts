import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentRequestService } from './document-request.service';
import {
  DocumentRequest,
  DocumentRequestStatus,
} from '../document-request.schema';
import {
  MEMBERSHIP_CARD_SLUG,
  RequestType,
} from '../../request-type/request-type.schema';
import { User, UserStatus } from '../../user/user.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildCardRequestTypeFixture,
  buildDocumentRequest,
  buildDocumentRequestModelMock,
  buildQueryChain,
  buildRequestTypeFixture,
  buildRequestTypeModelMock,
  buildUserFixture,
  buildUserModelMock,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_ID,
  FIXED_REQUEST_TYPE_ID,
  FIXED_USER_ID,
} from './__test-helpers__/document-request-test-fixtures';

describe('DocumentRequestService', () => {
  let service: DocumentRequestService;
  let mockDocRequestModel: ReturnType<typeof buildDocumentRequestModelMock>;
  let mockRequestTypeModel: ReturnType<typeof buildRequestTypeModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    mockDocRequestModel = buildDocumentRequestModelMock();
    mockRequestTypeModel = buildRequestTypeModelMock();
    mockUserModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentRequestService,
        {
          provide: getModelToken(DocumentRequest.name),
          useValue: mockDocRequestModel,
        },
        {
          provide: getModelToken(RequestType.name),
          useValue: mockRequestTypeModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<DocumentRequestService>(DocumentRequestService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOptions', () => {
    it('returns available document options with province pricing and card blocker status', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const t1 = buildRequestTypeFixture();
      const t2 = buildCardRequestTypeFixture();
      mockRequestTypeModel.find.mockReturnValue(buildQueryChain([t1, t2]));

      const result = await service.getOptions(FIXED_USER_ID);

      expect(mockUserModel.findById).toHaveBeenCalledWith(FIXED_USER_ID);
      expect(mockRequestTypeModel.find).toHaveBeenCalledWith({
        status: ActiveStatus.ACTIVE,
      });

      expect(result.options).toHaveLength(2);
      expect(result.options[0].slug).toBe('intro-letter');
      expect(result.options[0].fee).toBe(700000); // province override price
      expect(result.options[0].disabled).toBe(false);

      expect(result.options[1].slug).toBe(MEMBERSHIP_CARD_SLUG);
      expect(result.options[1].fee).toBe(300000);
      expect(result.options[1].disabled).toBe(false);
      expect(result.options[1].blockers).toEqual([]);
    });

    it('marks membership card as disabled when user profile is incomplete', async () => {
      const user = buildUserFixture({ photo: undefined, latinFullName: '' });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const t2 = buildCardRequestTypeFixture();
      mockRequestTypeModel.find.mockReturnValue(buildQueryChain([t2]));

      const result = await service.getOptions(FIXED_USER_ID);

      expect(result.options[0].disabled).toBe(true);
      expect(result.options[0].blockers).toEqual(['photo', 'latinName']);
    });

    it('throws NotFoundException if user does not exist', async () => {
      mockUserModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.getOptions(FIXED_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a PENDING document request and snapshots the province fee', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const requestType = buildRequestTypeFixture();
      mockRequestTypeModel.findById.mockReturnValue(
        buildQueryChain(requestType),
      );

      const created = buildDocumentRequest({
        fee: 700000,
        status: DocumentRequestStatus.PENDING,
        paymentStatus: PaymentStatus.NONE,
      });
      mockDocRequestModel.create.mockResolvedValue(created);
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(created));

      const result = await service.create(
        { requestType: FIXED_REQUEST_TYPE_ID, note: 'Embassy note' },
        FIXED_USER_ID,
      );

      expect(mockDocRequestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: user._id,
          requestType: requestType._id,
          fee: 700000,
          status: DocumentRequestStatus.PENDING,
          paymentStatus: PaymentStatus.NONE,
          note: 'Embassy note',
        }),
      );
      expect(result).toEqual(created);
    });

    it('throws ForbiddenException if member is not ACTIVE', async () => {
      const user = buildUserFixture({ status: UserStatus.REGISTERING });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if user is not found', async () => {
      mockUserModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if request type is not found', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));
      mockRequestTypeModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if request type is inactive', async () => {
      const user = buildUserFixture();
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const inactiveType = buildRequestTypeFixture({
        status: ActiveStatus.DISABLED,
      });
      mockRequestTypeModel.findById.mockReturnValue(
        buildQueryChain(inactiveType),
      );

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks membership card request when photo is missing', async () => {
      const user = buildUserFixture({ photo: undefined });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const cardType = buildCardRequestTypeFixture();
      mockRequestTypeModel.findById.mockReturnValue(buildQueryChain(cardType));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks membership card request when latin name is missing', async () => {
      const user = buildUserFixture({ latinFullName: '' });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const cardType = buildCardRequestTypeFixture();
      mockRequestTypeModel.findById.mockReturnValue(buildQueryChain(cardType));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks membership card request when membership type is missing', async () => {
      const user = buildUserFixture({ membershipType: null });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const cardType = buildCardRequestTypeFixture();
      mockRequestTypeModel.findById.mockReturnValue(buildQueryChain(cardType));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks membership card request when membership number is missing', async () => {
      const user = buildUserFixture({ membershipNo: null });
      mockUserModel.findById.mockReturnValue(buildQueryChain(user));

      const cardType = buildCardRequestTypeFixture();
      mockRequestTypeModel.findById.mockReturnValue(buildQueryChain(cardType));

      await expect(
        service.create({ requestType: FIXED_REQUEST_TYPE_ID }, FIXED_USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('returns paginated document requests for the given user', async () => {
      const r1 = buildDocumentRequest();
      const r2 = buildDocumentRequest({
        _id: '507f1f77bcf86cd799439099',
        status: DocumentRequestStatus.ACCEPTED,
      });

      mockDocRequestModel.find.mockReturnValue(buildQueryChain([r1, r2]));
      mockDocRequestModel.countDocuments.mockReturnValue(buildQueryChain(2));

      const result = await service.findAllByUser(FIXED_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([r1, r2]);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('applies status filter if provided', async () => {
      mockDocRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockDocRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllByUser(FIXED_USER_ID, {
        status: DocumentRequestStatus.ACCEPTED,
      });

      const expectedFilter = expect.objectContaining({
        user: expect.any(Object),
        status: DocumentRequestStatus.ACCEPTED,
      });
      // Self-validating: both find and countDocuments must use the same filter
      // to prevent a bug where pagination total ignores the status constraint.
      expect(mockDocRequestModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(mockDocRequestModel.countDocuments).toHaveBeenCalledWith(
        expectedFilter,
      );
    });
  });

  describe('findByIdAndUser', () => {
    it('returns the document request if owned by the user', async () => {
      const request = buildDocumentRequest();
      mockDocRequestModel.findOne.mockReturnValue(buildQueryChain(request));

      const result = await service.findByIdAndUser(
        FIXED_REQUEST_ID,
        FIXED_USER_ID,
      );

      expect(result).toEqual(request);
    });

    it('throws NotFoundException if not found or owned by another user', async () => {
      mockDocRequestModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findByIdAndUser(FIXED_REQUEST_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

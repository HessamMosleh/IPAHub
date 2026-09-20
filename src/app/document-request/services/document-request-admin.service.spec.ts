import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentRequestAdminService } from './document-request-admin.service';
import {
  DocumentRequest,
  DocumentRequestStatus,
} from '../document-request.schema';
import { RequestType } from '../../request-type/request-type.schema';
import { User, UserRole } from '../../user/user.schema';
import {
  Payment,
  PaymentSource,
  PaymentMethod,
} from '../../payment/payment.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import {
  buildCardRequestTypeFixture,
  buildDocumentRequest,
  buildDocumentRequestModelMock,
  buildPaymentModelMock,
  buildQueryChain,
  buildRequestTypeFixture,
  buildRequestTypeModelMock,
  buildUserFixture,
  buildUserModelMock,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_ID,
  FIXED_USER_ID,
} from './__test-helpers__/document-request-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';

describe('DocumentRequestAdminService', () => {
  let service: DocumentRequestAdminService;
  let mockDocRequestModel: ReturnType<typeof buildDocumentRequestModelMock>;
  let mockRequestTypeModel: ReturnType<typeof buildRequestTypeModelMock>;
  let mockUserModel: ReturnType<typeof buildUserModelMock>;
  let mockPaymentModel: ReturnType<typeof buildPaymentModelMock>;

  const superAdmin: AuthenticatedUser = {
    id: '507f1f77bcf86cd799439088',
    mobile: '+989129999999',
    roles: [UserRole.SUPER_ADMIN],
    province: FIXED_PROVINCE_ID,
    jti: 'jwt-super-admin',
  };

  const provinceAdmin: AuthenticatedUser = {
    id: '507f1f77bcf86cd799439077',
    mobile: '+989128888888',
    roles: [UserRole.PROVINCE_ADMIN],
    province: FIXED_PROVINCE_ID,
    managedProvinces: [FIXED_PROVINCE_ID],
    jti: 'jwt-province-admin',
  };

  beforeEach(async () => {
    mockDocRequestModel = buildDocumentRequestModelMock();
    mockRequestTypeModel = buildRequestTypeModelMock();
    mockUserModel = buildUserModelMock();
    mockPaymentModel = buildPaymentModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentRequestAdminService,
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
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
      ],
    }).compile();

    service = module.get<DocumentRequestAdminService>(
      DocumentRequestAdminService,
    );
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated document requests for super admin', async () => {
      const r1 = buildDocumentRequest();
      const r2 = buildDocumentRequest({
        _id: '507f1f77bcf86cd799439099',
        status: DocumentRequestStatus.ACCEPTED,
      });

      mockDocRequestModel.find.mockReturnValue(buildQueryChain([r1, r2]));
      mockDocRequestModel.countDocuments.mockReturnValue(buildQueryChain(2));

      const result = await service.findAll({ page: 1, limit: 50 }, superAdmin);

      expect(result.data).toEqual([r1, r2]);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('filters by attention synthetic state', async () => {
      mockDocRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockDocRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAll({ attention: true }, superAdmin);

      expect(mockDocRequestModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { status: DocumentRequestStatus.PENDING },
            {
              status: DocumentRequestStatus.ACCEPTED,
              paymentStatus: { $ne: PaymentStatus.PENDING },
            },
          ],
        }),
      );
    });

    it('scopes results to managed provinces for PROVINCE_ADMIN', async () => {
      mockUserModel.find.mockReturnValue(
        buildQueryChain([{ _id: FIXED_USER_ID }]),
      );
      mockDocRequestModel.find.mockReturnValue(buildQueryChain([]));
      mockDocRequestModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAll({}, provinceAdmin);

      expect(mockUserModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          province: { $in: [expect.any(Object)] },
        }),
      );
      expect(mockDocRequestModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { $in: [FIXED_USER_ID] },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns document request if found and within admin scope', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const request = buildDocumentRequest({ user });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.findById(FIXED_REQUEST_ID, provinceAdmin);

      expect(result).toEqual(request);
    });

    it('throws NotFoundException if request is not found', async () => {
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findById(FIXED_REQUEST_ID, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if request belongs to an unmanaged province', async () => {
      const otherProvinceId = '507f1f77bcf86cd799439099';
      const user = buildUserFixture({ province: otherProvinceId });
      const request = buildDocumentRequest({ user });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.findById(FIXED_REQUEST_ID, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('accept', () => {
    it('accepts a pending request with fee > 0 and transitions paymentStatus to PENDING', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const request = buildDocumentRequest({
        user,
        fee: 500000,
        status: DocumentRequestStatus.PENDING,
        paymentStatus: PaymentStatus.NONE,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.accept(FIXED_REQUEST_ID, superAdmin);

      expect(result.status).toBe(DocumentRequestStatus.ACCEPTED);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(request.save).toHaveBeenCalled();
    });

    it('accepts a pending free request (fee === 0) and keeps paymentStatus as NONE', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const request = buildDocumentRequest({
        user,
        fee: 0,
        status: DocumentRequestStatus.PENDING,
        paymentStatus: PaymentStatus.NONE,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.accept(FIXED_REQUEST_ID, superAdmin);

      expect(result.status).toBe(DocumentRequestStatus.ACCEPTED);
      expect(result.paymentStatus).toBe(PaymentStatus.NONE);
      expect(request.save).toHaveBeenCalled();
    });

    it('throws BadRequestException if request is already decided (not PENDING)', async () => {
      const user = buildUserFixture();
      const request = buildDocumentRequest({
        user,
        status: DocumentRequestStatus.ACCEPTED,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.accept(FIXED_REQUEST_ID, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('rejects a pending request and records the reason', async () => {
      const user = buildUserFixture();
      const request = buildDocumentRequest({
        user,
        status: DocumentRequestStatus.PENDING,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.reject(
        FIXED_REQUEST_ID,
        { reason: 'Missing prerequisite paperwork' },
        superAdmin,
      );

      expect(result.status).toBe(DocumentRequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Missing prerequisite paperwork');
      expect(request.save).toHaveBeenCalled();
    });

    it('throws BadRequestException if request is not PENDING', async () => {
      const user = buildUserFixture();
      const request = buildDocumentRequest({
        user,
        status: DocumentRequestStatus.REJECTED,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.reject(FIXED_REQUEST_ID, { reason: 'Some reason' }, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('fulfill', () => {
    it('fulfills an accepted paid request by attaching the issued file and setting COMPLETED', async () => {
      const user = buildUserFixture();
      const requestType = buildRequestTypeFixture({ producesDocument: true });
      const request = buildDocumentRequest({
        user,
        requestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.fulfill(
        FIXED_REQUEST_ID,
        {
          file: {
            key: 'documents/letter-123.pdf',
            originalName: 'letter.pdf',
            mimeType: 'application/pdf',
          },
        },
        superAdmin,
      );

      expect(result.status).toBe(DocumentRequestStatus.COMPLETED);
      expect(result.issuedFile?.key).toBe('documents/letter-123.pdf');
      expect(request.save).toHaveBeenCalled();
    });

    it('fulfills a non-document request without requiring a file', async () => {
      const user = buildUserFixture();
      const requestType = buildRequestTypeFixture({ producesDocument: false });
      const request = buildDocumentRequest({
        user,
        requestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.NONE,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      const result = await service.fulfill(FIXED_REQUEST_ID, {}, superAdmin);

      expect(result.status).toBe(DocumentRequestStatus.COMPLETED);
      expect(request.save).toHaveBeenCalled();
    });

    it('throws BadRequestException if request is still awaiting payment', async () => {
      const user = buildUserFixture();
      const requestType = buildRequestTypeFixture({ producesDocument: true });
      const request = buildDocumentRequest({
        user,
        requestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.fulfill(
          FIXED_REQUEST_ID,
          { file: { key: 'doc.pdf' } },
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if attempting to manually fulfill a membership-card request', async () => {
      const user = buildUserFixture();
      const cardType = buildCardRequestTypeFixture();
      const request = buildDocumentRequest({
        user,
        requestType: cardType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.fulfill(
          FIXED_REQUEST_ID,
          { file: { key: 'card.pdf' } },
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if file is missing for document-producing type', async () => {
      const user = buildUserFixture();
      const requestType = buildRequestTypeFixture({ producesDocument: true });
      const request = buildDocumentRequest({
        user,
        requestType,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.fulfill(FIXED_REQUEST_ID, {}, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markPaid', () => {
    it('confirms offline payment, sets PAID, and records payment ledger entry', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const requestType = buildRequestTypeFixture();
      const request = buildDocumentRequest({
        user,
        requestType,
        fee: 500000,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockPaymentModel.create.mockResolvedValue({});

      const result = await service.markPaid(
        FIXED_REQUEST_ID,
        {
          reference: 'TRK-12345',
          note: 'Bank transfer verified',
        },
        superAdmin,
      );

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      // Self-validating: the payment ledger must correctly attribute the
      // user, province, request type, and amount from the settled request.
      expect(mockPaymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 500000,
          source: PaymentSource.REQUEST,
          sourceId: request._id,
          user: user._id,
          province: FIXED_PROVINCE_ID,
          method: PaymentMethod.OFFLINE,
          reference: 'TRK-12345',
          note: 'Bank transfer verified',
        }),
      );
      expect(request.save).toHaveBeenCalled();
    });

    it('throws BadRequestException if request is not in ACCEPTED status', async () => {
      const user = buildUserFixture();
      const request = buildDocumentRequest({
        user,
        status: DocumentRequestStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.markPaid(FIXED_REQUEST_ID, {}, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if request is already paid', async () => {
      const user = buildUserFixture();
      const request = buildDocumentRequest({
        user,
        status: DocumentRequestStatus.ACCEPTED,
        paymentStatus: PaymentStatus.PAID,
      });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));

      await expect(
        service.markPaid(FIXED_REQUEST_ID, {}, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('deletes a document request if within province scope', async () => {
      const user = buildUserFixture({ province: FIXED_PROVINCE_ID });
      const request = buildDocumentRequest({ user });
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(request));
      mockDocRequestModel.findByIdAndDelete.mockReturnValue(
        buildQueryChain(request),
      );

      const result = await service.delete(FIXED_REQUEST_ID, provinceAdmin);

      expect(mockDocRequestModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_REQUEST_ID,
      );
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException if request does not exist', async () => {
      mockDocRequestModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.delete(FIXED_REQUEST_ID, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

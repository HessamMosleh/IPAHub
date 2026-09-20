import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRequestAdminController } from './document-request-admin.controller';
import { DocumentRequestAdminService } from '../services/document-request-admin.service';
import {
  buildDocumentRequest,
  FIXED_REQUEST_ID,
} from '../services/__test-helpers__/document-request-test-fixtures';
import { DocumentRequestStatus } from '../document-request.schema';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';

const buildMockAdmin = (): AuthenticatedUser => ({
  id: '507f1f77bcf86cd799439088',
  mobile: '+989129999999',
  roles: [UserRole.SUPER_ADMIN],
  province: '66fa3b5a9c1e7a001f3e9a11',
  jti: 'session-jti',
});

describe('DocumentRequestAdminController', () => {
  let controller: DocumentRequestAdminController;
  let mockAdminService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    accept: jest.Mock;
    reject: jest.Mock;
    fulfill: jest.Mock;
    markPaid: jest.Mock;
    delete: jest.Mock;
  };
  let mockAdmin: AuthenticatedUser;

  beforeEach(async () => {
    mockAdminService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      accept: jest.fn(),
      reject: jest.fn(),
      fulfill: jest.fn(),
      markPaid: jest.fn(),
      delete: jest.fn(),
    };
    mockAdmin = buildMockAdmin();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentRequestAdminController],
      providers: [
        {
          provide: DocumentRequestAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<DocumentRequestAdminController>(
      DocumentRequestAdminController,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists document requests delegating to service.findAll', async () => {
    const expected = {
      data: [buildDocumentRequest()],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    mockAdminService.findAll.mockResolvedValue(expected);

    const query = { page: 1, limit: 50 };
    const result = await controller.findAll(query, mockAdmin);

    expect(mockAdminService.findAll).toHaveBeenCalledWith(query, mockAdmin);
    expect(result).toEqual(expected);
  });

  it('gets request by id delegating to service.findById', async () => {
    const expected = buildDocumentRequest();
    mockAdminService.findById.mockResolvedValue(expected);

    const result = await controller.findById(FIXED_REQUEST_ID, mockAdmin);

    expect(mockAdminService.findById).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      mockAdmin,
    );
    expect(result).toEqual(expected);
  });

  it('accepts request delegating to service.accept', async () => {
    const expected = buildDocumentRequest({
      status: DocumentRequestStatus.ACCEPTED,
      paymentStatus: PaymentStatus.PENDING,
    });
    mockAdminService.accept.mockResolvedValue(expected);

    const result = await controller.accept(FIXED_REQUEST_ID, mockAdmin);

    expect(mockAdminService.accept).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      mockAdmin,
    );
    expect(result).toEqual(expected);
  });

  it('rejects request delegating to service.reject', async () => {
    const expected = buildDocumentRequest({
      status: DocumentRequestStatus.REJECTED,
      rejectionReason: 'Missing papers',
    });
    mockAdminService.reject.mockResolvedValue(expected);

    const dto = { reason: 'Missing papers' };
    const result = await controller.reject(FIXED_REQUEST_ID, dto, mockAdmin);

    expect(mockAdminService.reject).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(expected);
  });

  it('fulfills request delegating to service.fulfill', async () => {
    const expected = buildDocumentRequest({
      status: DocumentRequestStatus.COMPLETED,
    });
    mockAdminService.fulfill.mockResolvedValue(expected);

    const dto = { file: { key: 'documents/doc.pdf' } };
    const result = await controller.fulfill(FIXED_REQUEST_ID, dto, mockAdmin);

    expect(mockAdminService.fulfill).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(expected);
  });

  it('marks request paid delegating to service.markPaid', async () => {
    const expected = buildDocumentRequest({
      paymentStatus: PaymentStatus.PAID,
    });
    mockAdminService.markPaid.mockResolvedValue(expected);

    const dto = { reference: 'TRK-100', note: 'Receipt verified' };
    const result = await controller.markPaid(FIXED_REQUEST_ID, dto, mockAdmin);

    expect(mockAdminService.markPaid).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      dto,
      mockAdmin,
    );
    expect(result).toEqual(expected);
  });

  it('deletes request delegating to service.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_REQUEST_ID, mockAdmin);

    expect(mockAdminService.delete).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      mockAdmin,
    );
    expect(result).toEqual({ success: true });
  });
});

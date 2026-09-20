import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRequestController } from './document-request.controller';
import { DocumentRequestService } from '../services/document-request.service';
import {
  buildDocumentRequest,
  FIXED_REQUEST_ID,
  FIXED_REQUEST_TYPE_ID,
  FIXED_USER_ID,
} from '../services/__test-helpers__/document-request-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';

const buildMockUser = (): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '+989121234567',
  roles: [UserRole.USER],
  province: '66fa3b5a9c1e7a001f3e9a11',
  jti: 'session-jti',
});

describe('DocumentRequestController', () => {
  let controller: DocumentRequestController;
  let mockService: {
    getOptions: jest.Mock;
    create: jest.Mock;
    findAllByUser: jest.Mock;
    findByIdAndUser: jest.Mock;
  };
  let mockUser: AuthenticatedUser;

  beforeEach(async () => {
    mockService = {
      getOptions: jest.fn(),
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
    };
    mockUser = buildMockUser();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentRequestController],
      providers: [
        {
          provide: DocumentRequestService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DocumentRequestController>(
      DocumentRequestController,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('gets request options delegating to service.getOptions', async () => {
    const expected = {
      options: [
        {
          id: FIXED_REQUEST_TYPE_ID,
          slug: 'intro-letter',
          name: { en: 'Letter' },
          fee: 500000,
          producesDocument: true,
          disabled: false,
        },
      ],
    };
    mockService.getOptions.mockResolvedValue(expected);

    const result = await controller.getOptions(mockUser);

    expect(mockService.getOptions).toHaveBeenCalledWith(FIXED_USER_ID);
    expect(result).toEqual(expected);
  });

  it('submits a document request delegating to service.create', async () => {
    const dto = { requestType: FIXED_REQUEST_TYPE_ID, note: 'Visa letter' };
    const expected = buildDocumentRequest();
    mockService.create.mockResolvedValue(expected);

    const result = await controller.create(dto, mockUser);

    expect(mockService.create).toHaveBeenCalledWith(dto, FIXED_USER_ID);
    expect(result).toEqual(expected);
  });

  it('lists current member requests delegating to service.findAllByUser', async () => {
    const expected = {
      data: [buildDocumentRequest()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockService.findAllByUser.mockResolvedValue(expected);

    const result = await controller.findAll({ page: 1, limit: 20 }, mockUser);

    expect(mockService.findAllByUser).toHaveBeenCalledWith(FIXED_USER_ID, {
      page: 1,
      limit: 20,
    });
    expect(result).toEqual(expected);
  });

  it('gets request by id delegating to service.findByIdAndUser', async () => {
    const expected = buildDocumentRequest();
    mockService.findByIdAndUser.mockResolvedValue(expected);

    const result = await controller.findById(FIXED_REQUEST_ID, mockUser);

    expect(mockService.findByIdAndUser).toHaveBeenCalledWith(
      FIXED_REQUEST_ID,
      FIXED_USER_ID,
    );
    expect(result).toEqual(expected);
  });
});

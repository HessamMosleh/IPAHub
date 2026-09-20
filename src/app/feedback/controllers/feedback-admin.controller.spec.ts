import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackAdminController } from './feedback-admin.controller';
import { FeedbackAdminService } from '../services/feedback-admin.service';
import {
  buildFeedbackDoc,
  FIXED_FEEDBACK_ID,
} from '../services/__test-helpers__/feedback-test-fixtures';

describe('FeedbackAdminController', () => {
  let controller: FeedbackAdminController;
  let mockService: {
    findAll: jest.Mock;
    countUnresolved: jest.Mock;
    findById: jest.Mock;
    resolve: jest.Mock;
    unresolve: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      countUnresolved: jest.fn(),
      findById: jest.fn(),
      resolve: jest.fn(),
      unresolve: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackAdminController],
      providers: [
        {
          provide: FeedbackAdminService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FeedbackAdminController>(FeedbackAdminController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists feedbacks delegating to service.findAll', async () => {
    const paginated = {
      data: [buildFeedbackDoc()],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    mockService.findAll.mockResolvedValue(paginated);

    const query = { page: 1, limit: 50, resolved: false };
    const result = await controller.findAll(query);

    expect(mockService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(paginated);
  });

  it('gets pending count delegating to service.countUnresolved', async () => {
    mockService.countUnresolved.mockResolvedValue({ count: 4 });

    const result = await controller.getPendingCount();

    expect(mockService.countUnresolved).toHaveBeenCalled();
    expect(result).toEqual({ count: 4 });
  });

  it('retrieves feedback by id delegating to service.findById', async () => {
    const doc = buildFeedbackDoc();
    mockService.findById.mockResolvedValue(doc);

    const result = await controller.findById(FIXED_FEEDBACK_ID);

    expect(mockService.findById).toHaveBeenCalledWith(FIXED_FEEDBACK_ID);
    expect(result).toEqual(doc);
  });

  it('marks feedback resolved delegating to service.resolve', async () => {
    const doc = buildFeedbackDoc({ resolved: true });
    mockService.resolve.mockResolvedValue(doc);

    const result = await controller.resolve(FIXED_FEEDBACK_ID);

    expect(mockService.resolve).toHaveBeenCalledWith(FIXED_FEEDBACK_ID);
    expect(result).toEqual(doc);
  });

  it('reopens feedback delegating to service.unresolve', async () => {
    const doc = buildFeedbackDoc({ resolved: false });
    mockService.unresolve.mockResolvedValue(doc);

    const result = await controller.unresolve(FIXED_FEEDBACK_ID);

    expect(mockService.unresolve).toHaveBeenCalledWith(FIXED_FEEDBACK_ID);
    expect(result).toEqual(doc);
  });

  it('deletes feedback delegating to service.delete', async () => {
    mockService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_FEEDBACK_ID);

    expect(mockService.delete).toHaveBeenCalledWith(FIXED_FEEDBACK_ID);
    expect(result).toEqual({ success: true });
  });
});

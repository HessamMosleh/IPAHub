import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from '../services/feedback.service';
import {
  buildFeedbackDoc,
  FIXED_FEEDBACK_ID,
  FIXED_USER_ID,
} from '../services/__test-helpers__/feedback-test-fixtures';
import { AuthenticatedUser } from '../../auth/types';
import { UserRole } from '../../user/user.schema';

const buildMockUser = (): AuthenticatedUser => ({
  id: FIXED_USER_ID,
  mobile: '+989121234567',
  roles: [UserRole.USER],
  province: '66fa3b5a9c1e7a001f3e9a11',
  jti: 'session-jti',
});

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let mockService: {
    create: jest.Mock;
    findAllByUser: jest.Mock;
    findByIdAndUser: jest.Mock;
  };
  let mockUser: AuthenticatedUser;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
    };
    mockUser = buildMockUser();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('submits feedback delegating to service.create', async () => {
    const doc = buildFeedbackDoc();
    mockService.create.mockResolvedValue(doc);

    const dto = {
      subject: 'Great event',
      body: 'Loved the workshops.',
    };

    const result = await controller.create(dto, mockUser);

    expect(mockService.create).toHaveBeenCalledWith(dto, mockUser.id);
    expect(result).toEqual(doc);
  });

  it('lists user feedback delegating to service.findAllByUser', async () => {
    const paginated = {
      data: [buildFeedbackDoc()],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    mockService.findAllByUser.mockResolvedValue(paginated);

    const query = { page: 1, limit: 50 };
    const result = await controller.findAll(query, mockUser);

    expect(mockService.findAllByUser).toHaveBeenCalledWith(mockUser.id, query);
    expect(result).toEqual(paginated);
  });

  it('retrieves user feedback by id delegating to service.findByIdAndUser', async () => {
    const doc = buildFeedbackDoc();
    mockService.findByIdAndUser.mockResolvedValue(doc);

    const result = await controller.findById(FIXED_FEEDBACK_ID, mockUser);

    expect(mockService.findByIdAndUser).toHaveBeenCalledWith(
      FIXED_FEEDBACK_ID,
      mockUser.id,
    );
    expect(result).toEqual(doc);
  });
});

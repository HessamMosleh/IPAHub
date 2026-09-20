import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import {
  MemberFeedback,
  MemberFeedbackProp,
} from '../member-feedback.schema';
import { User, UserStatus } from '../../user/user.schema';
import {
  buildFeedbackDoc,
  buildFeedbackModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_FEEDBACK_ID,
  FIXED_USER_ID,
} from './__test-helpers__/feedback-test-fixtures';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let feedbackModel: ReturnType<typeof buildFeedbackModelMock>;
  let userModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    feedbackModel = buildFeedbackModelMock();
    userModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getModelToken(MemberFeedback.name),
          useValue: feedbackModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and returns feedback for an active member', async () => {
      const activeUser = buildUserFixture({ status: UserStatus.ACTIVE });
      userModel.findById.mockReturnValue(buildQueryChain(activeUser));

      const dto = {
        subject: 'Great conference',
        body: 'Thank you for the well-organized conference in Shiraz.',
      };

      const result = await service.create(dto, FIXED_USER_ID);

      expect(userModel.findById).toHaveBeenCalledWith(FIXED_USER_ID);
      expect(result).toBeDefined();
      expect(result.body).toBe(dto.body);
      expect(result.subject).toBe(dto.subject);
      expect(result.resolved).toBe(false);
    });

    it('throws NotFoundException if user id is invalid', async () => {
      await expect(
        service.create({ body: 'test' }, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if user is not found', async () => {
      userModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.create({ body: 'test' }, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user status is REGISTERING', async () => {
      const inactiveUser = buildUserFixture({
        status: UserStatus.REGISTERING,
      });
      userModel.findById.mockReturnValue(buildQueryChain(inactiveUser));

      await expect(
        service.create({ body: 'test' }, FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if user status is REJECTED', async () => {
      const rejectedUser = buildUserFixture({ status: UserStatus.REJECTED });
      userModel.findById.mockReturnValue(buildQueryChain(rejectedUser));

      await expect(
        service.create({ body: 'test' }, FIXED_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByUser', () => {
    it('returns paginated feedbacks for the authenticated user', async () => {
      const doc = buildFeedbackDoc();
      const chain = buildQueryChain([doc]);
      feedbackModel.find.mockReturnValue(chain);
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAllByUser(FIXED_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(feedbackModel.find).toHaveBeenCalled();
      expect(chain.select).toHaveBeenCalledWith(MemberFeedbackProp.general);
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result.data).toEqual([doc]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('filters by resolved status when provided', async () => {
      const chain = buildQueryChain([]);
      feedbackModel.find.mockReturnValue(chain);
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAllByUser(FIXED_USER_ID, {
        resolved: false,
      });

      expect(feedbackModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: false }),
      );
    });

    it('throws NotFoundException if user id is invalid', async () => {
      await expect(
        service.findAllByUser('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdAndUser', () => {
    it('returns feedback owned by the user', async () => {
      const doc = buildFeedbackDoc();
      const chain = buildQueryChain(doc);
      feedbackModel.findOne.mockReturnValue(chain);

      const result = await service.findByIdAndUser(
        FIXED_FEEDBACK_ID,
        FIXED_USER_ID,
      );

      expect(feedbackModel.findOne).toHaveBeenCalled();
      expect(chain.select).toHaveBeenCalledWith(MemberFeedbackProp.general);
      expect(result).toEqual(doc);
    });

    it('throws NotFoundException if feedback is not found', async () => {
      const chain = buildQueryChain(null);
      feedbackModel.findOne.mockReturnValue(chain);

      await expect(
        service.findByIdAndUser(FIXED_FEEDBACK_ID, FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if id is invalid', async () => {
      await expect(
        service.findByIdAndUser('invalid-id', FIXED_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

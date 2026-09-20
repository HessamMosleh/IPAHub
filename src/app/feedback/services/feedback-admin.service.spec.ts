import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { FeedbackAdminService } from './feedback-admin.service';
import { MemberFeedback } from '../member-feedback.schema';
import { User } from '../../user/user.schema';
import {
  buildFeedbackDoc,
  buildFeedbackModelMock,
  buildQueryChain,
  buildUserFixture,
  buildUserModelMock,
  FIXED_FEEDBACK_ID,
  FIXED_USER_ID,
} from './__test-helpers__/feedback-test-fixtures';

describe('FeedbackAdminService', () => {
  let service: FeedbackAdminService;
  let feedbackModel: ReturnType<typeof buildFeedbackModelMock>;
  let userModel: ReturnType<typeof buildUserModelMock>;

  beforeEach(async () => {
    feedbackModel = buildFeedbackModelMock();
    userModel = buildUserModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackAdminService,
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

    service = module.get<FeedbackAdminService>(FeedbackAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated feedback list sorted by resolved asc, createdAt desc', async () => {
      const doc = buildFeedbackDoc();
      const chain = buildQueryChain([doc]);
      feedbackModel.find.mockReturnValue(chain);
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(feedbackModel.find).toHaveBeenCalledWith({});
      expect(chain.populate).toHaveBeenCalledWith({
        path: 'user',
        select: 'fullName latinFullName mobile nationalCode province',
      });
      expect(chain.sort).toHaveBeenCalledWith({ resolved: 1, createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(result.data).toEqual([doc]);
      expect(result.total).toBe(1);
    });

    it('filters by resolved status when supplied', async () => {
      const chain = buildQueryChain([]);
      feedbackModel.find.mockReturnValue(chain);
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ resolved: false });

      expect(feedbackModel.find).toHaveBeenCalledWith({ resolved: false });
    });

    it('searches by keyword across sender and subject/body', async () => {
      const matchingUser = buildUserFixture();
      const userChain = buildQueryChain([matchingUser]);
      userModel.find.mockReturnValue(userChain);

      const chain = buildQueryChain([]);
      feedbackModel.find.mockReturnValue(chain);
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ search: 'Ali' });

      expect(userModel.find).toHaveBeenCalled();
      expect(feedbackModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ subject: expect.any(RegExp) }),
            expect.objectContaining({ body: expect.any(RegExp) }),
            expect.objectContaining({
              user: { $in: [matchingUser._id] },
            }),
          ]),
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns feedback with populated user by id', async () => {
      const doc = buildFeedbackDoc();
      const chain = buildQueryChain(doc);
      feedbackModel.findById.mockReturnValue(chain);

      const result = await service.findById(FIXED_FEEDBACK_ID);

      expect(feedbackModel.findById).toHaveBeenCalledWith(FIXED_FEEDBACK_ID);
      expect(chain.populate).toHaveBeenCalledWith({
        path: 'user',
        select: 'fullName latinFullName mobile nationalCode province',
      });
      expect(result).toEqual(doc);
    });

    it('throws NotFoundException if id is invalid', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if feedback is not found', async () => {
      const chain = buildQueryChain(null);
      feedbackModel.findById.mockReturnValue(chain);

      await expect(service.findById(FIXED_FEEDBACK_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolve', () => {
    it('marks feedback as resolved', async () => {
      const doc = buildFeedbackDoc({ resolved: false });
      const populatedDoc = buildFeedbackDoc({ resolved: true });

      // First findById call (for existence and mutation)
      feedbackModel.findById
        .mockReturnValueOnce(buildQueryChain(doc))
        // Second findById call (via this.findById with populate)
        .mockReturnValueOnce(buildQueryChain(populatedDoc));

      const result = await service.resolve(FIXED_FEEDBACK_ID);

      expect(doc.resolved).toBe(true);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual(populatedDoc);
    });

    it('throws NotFoundException if feedback to resolve is not found', async () => {
      feedbackModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.resolve(FIXED_FEEDBACK_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unresolve', () => {
    it('reopens feedback marking it as unresolved', async () => {
      const doc = buildFeedbackDoc({ resolved: true });
      const populatedDoc = buildFeedbackDoc({ resolved: false });

      feedbackModel.findById
        .mockReturnValueOnce(buildQueryChain(doc))
        .mockReturnValueOnce(buildQueryChain(populatedDoc));

      const result = await service.unresolve(FIXED_FEEDBACK_ID);

      expect(doc.resolved).toBe(false);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual(populatedDoc);
    });

    it('throws NotFoundException if feedback to unresolve is not found', async () => {
      feedbackModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.unresolve(FIXED_FEEDBACK_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes feedback and returns success', async () => {
      const doc = buildFeedbackDoc();
      feedbackModel.findById.mockReturnValue(buildQueryChain(doc));
      feedbackModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.delete(FIXED_FEEDBACK_ID);

      expect(feedbackModel.deleteOne).toHaveBeenCalledWith({
        _id: FIXED_FEEDBACK_ID,
      });
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException if feedback to delete is not found', async () => {
      feedbackModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.delete(FIXED_FEEDBACK_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('countUnresolved', () => {
    it('returns count of unresolved feedbacks', async () => {
      feedbackModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.countUnresolved();

      expect(feedbackModel.countDocuments).toHaveBeenCalledWith({
        resolved: false,
      });
      expect(result).toEqual({ count: 5 });
    });
  });
});

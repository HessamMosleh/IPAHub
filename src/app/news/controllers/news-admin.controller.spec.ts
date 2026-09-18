import { Test, TestingModule } from '@nestjs/testing';
import { NewsAdminController } from './news-admin.controller';
import { NewsAdminService } from '../services/news-admin.service';
import {
  buildNews,
  buildSuperAdminUser,
  FIXED_NEWS_ID,
} from '../services/__test-helpers__/news-test-fixtures';
import { NewsCategory } from '../news.schema';

describe('NewsAdminController', () => {
  let controller: NewsAdminController;
  let mockAdminService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  const mockUser = buildSuperAdminUser();

  // Independent: each test rebuilds the mock service, so call counts reset
  // and order of tests does not matter.
  beforeEach(async () => {
    mockAdminService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsAdminController],
      providers: [
        {
          provide: NewsAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<NewsAdminController>(NewsAdminController);
  });

  // No "is defined" tautology.

  it('forwards (query, user) to NewsAdminService.findAll', async () => {
    const post = buildNews();
    const mockResult = {
      data: [post],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockAdminService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll({}, mockUser);

    expect(mockAdminService.findAll).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findAll).toHaveBeenCalledWith({}, mockUser);
    expect(result).toEqual(mockResult);
  });

  it('forwards (id, user) to NewsAdminService.findById', async () => {
    const post = buildNews();
    mockAdminService.findById.mockResolvedValue(post);

    const result = await controller.findById(FIXED_NEWS_ID, mockUser);

    expect(mockAdminService.findById).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findById).toHaveBeenCalledWith(
      FIXED_NEWS_ID,
      mockUser,
    );
    expect(result).toEqual(post);
  });

  it('forwards (dto, user) to NewsAdminService.create', async () => {
    const post = buildNews();
    mockAdminService.create.mockResolvedValue(post);
    const dto = {
      title: { en: 'New' },
      content: { en: '<p>Content</p>' },
      category: NewsCategory.NATIONAL,
    };

    const result = await controller.create(dto, mockUser);

    expect(mockAdminService.create).toHaveBeenCalledTimes(1);
    expect(mockAdminService.create).toHaveBeenCalledWith(dto, mockUser);
    expect(result).toEqual(post);
  });

  it('forwards (id, dto, user) to NewsAdminService.update', async () => {
    const post = buildNews();
    mockAdminService.update.mockResolvedValue(post);
    const dto = { title: { en: 'Updated' } };

    const result = await controller.update(FIXED_NEWS_ID, dto, mockUser);

    expect(mockAdminService.update).toHaveBeenCalledTimes(1);
    expect(mockAdminService.update).toHaveBeenCalledWith(
      FIXED_NEWS_ID,
      dto,
      mockUser,
    );
    expect(result).toEqual(post);
  });

  it('forwards (id, user) to NewsAdminService.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_NEWS_ID, mockUser);

    expect(mockAdminService.delete).toHaveBeenCalledTimes(1);
    expect(mockAdminService.delete).toHaveBeenCalledWith(
      FIXED_NEWS_ID,
      mockUser,
    );
    expect(result).toEqual({ success: true });
  });

  it('does not silently swallow service errors', async () => {
    // Self-validating: the controller must let exceptions bubble to Nest's
    // exception filter, not try/catch them.
    const err = new Error('boom');
    mockAdminService.findById.mockRejectedValue(err);

    await expect(controller.findById(FIXED_NEWS_ID, mockUser)).rejects.toBe(
      err,
    );
  });
});

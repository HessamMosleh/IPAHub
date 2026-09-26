import { Test, TestingModule } from '@nestjs/testing';
import { ArticleAdminController } from './article-admin.controller';
import { ArticleAdminService } from '../services/article-admin.service';
import {
  buildArticle,
  buildSuperAdminUser,
  FIXED_ARTICLE_ID,
} from '../services/__test-helpers__/article-test-fixtures';
import { ArticleCategory } from '../article.schema';

describe('ArticleAdminController', () => {
  let controller: ArticleAdminController;
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
      controllers: [ArticleAdminController],
      providers: [
        {
          provide: ArticleAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<ArticleAdminController>(ArticleAdminController);
  });

  // No "is defined" tautology.

  it('forwards (query, user) to ArticleAdminService.findAll', async () => {
    const post = buildArticle();
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

  it('forwards (id, user) to ArticleAdminService.findById', async () => {
    const post = buildArticle();
    mockAdminService.findById.mockResolvedValue(post);

    const result = await controller.findById(FIXED_ARTICLE_ID, mockUser);

    expect(mockAdminService.findById).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findById).toHaveBeenCalledWith(
      FIXED_ARTICLE_ID,
      mockUser,
    );
    expect(result).toEqual(post);
  });

  it('forwards (dto, user) to ArticleAdminService.create', async () => {
    const post = buildArticle();
    mockAdminService.create.mockResolvedValue(post);
    const dto = {
      title: { en: 'New' },
      content: { en: '<p>Content</p>' },
      category: ArticleCategory.NATIONAL,
    };

    const result = await controller.create(dto, mockUser);

    expect(mockAdminService.create).toHaveBeenCalledTimes(1);
    expect(mockAdminService.create).toHaveBeenCalledWith(dto, mockUser);
    expect(result).toEqual(post);
  });

  it('forwards (id, dto, user) to ArticleAdminService.update', async () => {
    const post = buildArticle();
    mockAdminService.update.mockResolvedValue(post);
    const dto = { title: { en: 'Updated' } };

    const result = await controller.update(FIXED_ARTICLE_ID, dto, mockUser);

    expect(mockAdminService.update).toHaveBeenCalledTimes(1);
    expect(mockAdminService.update).toHaveBeenCalledWith(
      FIXED_ARTICLE_ID,
      dto,
      mockUser,
    );
    expect(result).toEqual(post);
  });

  it('forwards (id, user) to ArticleAdminService.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_ARTICLE_ID, mockUser);

    expect(mockAdminService.delete).toHaveBeenCalledTimes(1);
    expect(mockAdminService.delete).toHaveBeenCalledWith(
      FIXED_ARTICLE_ID,
      mockUser,
    );
    expect(result).toEqual({ success: true });
  });

  it('does not silently swallow service errors', async () => {
    // Self-validating: the controller must let exceptions bubble to Nest's
    // exception filter, not try/catch them.
    const err = new Error('boom');
    mockAdminService.findById.mockRejectedValue(err);

    await expect(controller.findById(FIXED_ARTICLE_ID, mockUser)).rejects.toBe(
      err,
    );
  });
});

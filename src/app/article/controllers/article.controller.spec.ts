import { Test, TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller';
import { ArticleService } from '../services/article.service';
import {
  buildArticle,
  FIXED_ARTICLE_ID,
  FIXED_PUBLISHED_AT,
} from '../services/__test-helpers__/article-test-fixtures';

describe('ArticleController', () => {
  let controller: ArticleController;
  let mockService: {
    findAll: jest.Mock;
    findById: jest.Mock;
  };

  // Independent: fresh mocks and module per test.
  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [
        {
          provide: ArticleService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ArticleController>(ArticleController);
  });

  // No "is defined" tautology — it asserts the obvious and hides the case
  // where the controller is wired up but routes do nothing.

  it('passes the public query dto through to ArticleService.findAll and returns its paginated result', async () => {
    // Arrange
    const post = buildArticle();
    const mockResult = {
      data: [post],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockService.findAll.mockResolvedValue(mockResult);

    // Act
    const result = await controller.findAll({ page: 1, limit: 20 });

    // Assert: Self-validating — both that delegation happened with the right
    // args and that the controller returns the service's value as-is.
    expect(mockService.findAll).toHaveBeenCalledTimes(1);
    expect(mockService.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result).toEqual(mockResult);
  });

  it('forwards the id param to ArticleService.findById', async () => {
    const post = buildArticle();
    mockService.findById.mockResolvedValue(post);

    const result = await controller.findById(FIXED_ARTICLE_ID);

    expect(mockService.findById).toHaveBeenCalledTimes(1);
    expect(mockService.findById).toHaveBeenCalledWith(FIXED_ARTICLE_ID);
    expect(result).toEqual(post);
  });

  it('propagates service errors to the caller (no swallowing)', async () => {
    // Self-validating: the controller does not silently `try/catch` — errors
    // bubble so Nest's exception filter can turn them into HTTP responses.
    const err = new Error('boom');
    mockService.findById.mockRejectedValue(err);

    await expect(controller.findById(FIXED_ARTICLE_ID)).rejects.toBe(err);
  });
});

// Lightweight re-export check to keep this file self-contained and to
// guarantee the fixtures the controller spec depends on are importable from
// the same path the service spec uses (catches refactor drift).
describe('article-test-fixtures', () => {
  it('exports a fixed, deterministic article id', () => {
    expect(FIXED_ARTICLE_ID).toBe('507f1f77bcf86cd799439011');
    expect(FIXED_PUBLISHED_AT).toBe('2026-09-18T10:00:00.000Z');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ArticleAdminService } from './article-admin.service';
import { Article, ArticleCategory, ArticleStatus } from '../article.schema';
import { Province } from '../../../common/schemas/province.schema';
import {
  buildArticleModelMock,
  buildProvinceModelMock,
  buildArticle,
  buildQueryChain,
  buildSuperAdminUser,
  buildProvinceAdminUser,
  FIXED_ARTICLE_ID,
  FIXED_PROVINCE_ID,
  OTHER_PROVINCE_ID,
  FIXED_PUBLISHED_AT,
} from './__test-helpers__/article-test-fixtures';

describe('ArticleAdminService', () => {
  let service: ArticleAdminService;
  let mockArticleModel: ReturnType<typeof buildArticleModelMock>;
  let mockProvinceModel: ReturnType<typeof buildProvinceModelMock>;

  // Independent: every test gets a fresh TestingModule and fresh mocks.
  beforeEach(async () => {
    mockArticleModel = buildArticleModelMock();
    mockProvinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleAdminService,
        {
          provide: getModelToken(Article.name),
          useValue: mockArticleModel,
        },
        {
          provide: getModelToken(Province.name),
          useValue: mockProvinceModel,
        },
      ],
    }).compile();

    service = module.get<ArticleAdminService>(ArticleAdminService);
  });

  // No "is defined" tautology — it adds no real validation (Self-validating).

  describe('findAll', () => {
    it('returns all articles for super admin without province restrictions', async () => {
      const n1 = buildArticle();
      mockArticleModel.find.mockReturnValue(buildQueryChain([n1]));
      mockArticleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const superAdmin = buildSuperAdminUser();
      const result = await service.findAll({}, superAdmin);

      expect(result.data).toEqual([n1]);
      const filter = (
        mockArticleModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // No scoping clause is set for super admin.
      expect(filter.province).toBeUndefined();
      expect(filter.category).toBeUndefined();
    });

    it('scopes query to managed provinces for province admin', async () => {
      mockArticleModel.find.mockReturnValue(buildQueryChain([]));
      mockArticleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      await service.findAll({}, provinceAdmin);

      const filter = (
        mockArticleModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // Province admins can ONLY see provincial posts in their scope.
      expect(filter.category).toBe(ArticleCategory.PROVINCIAL);
      expect(filter.province).toBeDefined();
    });

    it('throws ForbiddenException if province admin queries an unmanaged province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.findAll({ province: OTHER_PROVINCE_ID }, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('filters by publication status', async () => {
      mockArticleModel.find.mockReturnValue(buildQueryChain([]));
      mockArticleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ status: ArticleStatus.REGISTERING });

      const filter = (
        mockArticleModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(ArticleStatus.REGISTERING);
    });
  });

  describe('findById', () => {
    it('returns article for super admin', async () => {
      const post = buildArticle();
      mockArticleModel.findById.mockReturnValue(buildQueryChain(post));

      const result = await service.findById(
        FIXED_ARTICLE_ID,
        buildSuperAdminUser(),
      );
      expect(result).toEqual(post);
    });

    it('returns provincial article for authorized province admin', async () => {
      const post = buildArticle({
        category: ArticleCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockArticleModel.findById.mockReturnValue(buildQueryChain(post));

      const result = await service.findById(
        FIXED_ARTICLE_ID,
        buildProvinceAdminUser([FIXED_PROVINCE_ID]),
      );
      expect(result).toEqual(post);
    });

    it('throws ForbiddenException if province admin accesses post in another province', async () => {
      const post = buildArticle({
        category: ArticleCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockArticleModel.findById.mockReturnValue(buildQueryChain(post));

      await expect(
        service.findById(
          FIXED_ARTICLE_ID,
          buildProvinceAdminUser([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if province admin accesses national article in admin view', async () => {
      const post = buildArticle({ category: ArticleCategory.NATIONAL });
      mockArticleModel.findById.mockReturnValue(buildQueryChain(post));

      await expect(
        service.findById(
          FIXED_ARTICLE_ID,
          buildProvinceAdminUser([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if post not found', async () => {
      mockArticleModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findById(FIXED_ARTICLE_ID, buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for malformed ObjectId without hitting DB', async () => {
      await expect(
        service.findById('not-a-mongo-id', buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
      expect(mockArticleModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('allows super admin to create national article', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildArticle({ _id: FIXED_ARTICLE_ID });
      mockArticleModel.create.mockResolvedValue(createdPost);
      mockArticleModel.findById.mockReturnValue(buildQueryChain(createdPost));

      const result = await service.create(
        {
          title: { en: 'National Event' },
          content: { en: '<p>Content</p>' },
          category: ArticleCategory.NATIONAL,
        },
        superAdmin,
      );

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ArticleCategory.NATIONAL,
          province: undefined,
        }),
      );
      expect(result).toBeDefined();
    });

    it('blocks province admin from creating national article', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.create(
          {
            title: { en: 'National Attempt' },
            content: { en: '<p>Content</p>' },
            category: ArticleCategory.NATIONAL,
          },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      // Self-validating: also confirm no row was created.
      expect(mockArticleModel.create).not.toHaveBeenCalled();
    });

    it('allows province admin to create article in their managed province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      mockProvinceModel.exists.mockResolvedValue({ _id: FIXED_PROVINCE_ID });

      const createdPost = buildArticle({
        _id: FIXED_ARTICLE_ID,
        category: ArticleCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockArticleModel.create.mockResolvedValue(createdPost);
      mockArticleModel.findById.mockReturnValue(buildQueryChain(createdPost));

      const result = await service.create(
        {
          title: { en: 'Provincial Notice' },
          content: { en: '<p>Notice</p>' },
          category: ArticleCategory.PROVINCIAL,
          province: FIXED_PROVINCE_ID,
        },
        provinceAdmin,
      );

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ArticleCategory.PROVINCIAL,
        }),
      );
      expect(result).toBeDefined();
    });

    it('blocks province admin from creating article in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.create(
          {
            title: { en: 'Hijack Notice' },
            content: { en: '<p>Notice</p>' },
            category: ArticleCategory.PROVINCIAL,
            province: OTHER_PROVINCE_ID,
          },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockArticleModel.create).not.toHaveBeenCalled();
    });

    it('requires province when category is PROVINCIAL', async () => {
      const superAdmin = buildSuperAdminUser();

      await expect(
        service.create(
          {
            title: { en: 'Notice' },
            content: { en: '<p>Notice</p>' },
            category: ArticleCategory.PROVINCIAL,
          },
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects PROVINCIAL with malformed province id', async () => {
      const superAdmin = buildSuperAdminUser();

      await expect(
        service.create(
          {
            title: { en: 'Notice' },
            content: { en: '<p>Notice</p>' },
            category: ArticleCategory.PROVINCIAL,
            province: 'not-an-id',
          },
          superAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects PROVINCIAL when province id does not exist', async () => {
      const superAdmin = buildSuperAdminUser();
      mockProvinceModel.exists.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: { en: 'Notice' },
            content: { en: '<p>Notice</p>' },
            category: ArticleCategory.PROVINCIAL,
            province: FIXED_PROVINCE_ID,
          },
          superAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sanitizes script tags from English content on write', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildArticle({ _id: FIXED_ARTICLE_ID });
      mockArticleModel.create.mockResolvedValue(createdPost);
      mockArticleModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'Security Test' },
          content: { en: '<p>Safe</p><script>alert("XSS")</script>' },
          category: ArticleCategory.NATIONAL,
        },
        superAdmin,
      );

      const createArg = (
        mockArticleModel.create.mock.calls[0] as unknown as [
          { content: { en: string; fa?: string } },
        ]
      )[0];
      expect(createArg.content.en).not.toContain('<script>');
      expect(createArg.content.en).toContain('<p>Safe</p>');
    });

    it('sanitizes iframes from Persian content on write', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildArticle({ _id: FIXED_ARTICLE_ID });
      mockArticleModel.create.mockResolvedValue(createdPost);
      mockArticleModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'Security Test' },
          content: {
            en: '<p>Safe</p>',
            fa: '<p>امن</p><iframe src="malicious"></iframe>',
          },
          category: ArticleCategory.NATIONAL,
        },
        superAdmin,
      );

      const createArg = (
        mockArticleModel.create.mock.calls[0] as unknown as [
          { content: { en: string; fa?: string } },
        ]
      )[0];
      expect(createArg.content.fa).not.toContain('<iframe');
      expect(createArg.content.fa).toContain('<p>امن</p>');
    });

    it('sets status from the published boolean when status is not provided', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildArticle({ _id: FIXED_ARTICLE_ID });
      mockArticleModel.create.mockResolvedValue(createdPost);
      mockArticleModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'T' },
          content: { en: '<p>c</p>' },
          category: ArticleCategory.NATIONAL,
          published: true,
        },
        superAdmin,
      );

      const createArg = (
        mockArticleModel.create.mock.calls[0] as unknown as [
          { status: ArticleStatus },
        ]
      )[0];
      expect(createArg.status).toBe(ArticleStatus.ACTIVE);
    });
  });

  describe('update', () => {
    it('updates article for super admin', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildArticle();
      mockArticleModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_ARTICLE_ID,
        { title: { en: 'Updated Title' } },
        superAdmin,
      );

      expect(existing.save).toHaveBeenCalled();
      expect(existing.title.en).toBe('Updated Title');
    });

    it('throws NotFoundException for a malformed ObjectId without hitting DB', async () => {
      await expect(
        service.update(
          'not-a-mongo-id',
          { title: { en: 'X' } },
          buildSuperAdminUser(),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockArticleModel.findById).not.toHaveBeenCalled();
    });

    it('blocks province admin from editing post in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildArticle({
        category: ArticleCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockArticleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.update(
          FIXED_ARTICLE_ID,
          { title: { en: 'Attempt' } },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks province admin from changing category to national', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildArticle({
        category: ArticleCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockArticleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.update(
          FIXED_ARTICLE_ID,
          { category: ArticleCategory.NATIONAL },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sanitizes incoming content on update', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildArticle();
      mockArticleModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_ARTICLE_ID,
        { content: { en: '<p>safe</p><script>alert(1)</script>' } },
        superAdmin,
      );

      expect(existing.content.en).not.toContain('<script>');
      expect(existing.content.en).toContain('<p>safe</p>');
    });

    it('sets publishedAt to now when status moves to ACTIVE without an explicit date and no prior publishedAt', async () => {
      const superAdmin = buildSuperAdminUser();
      // publishedAt explicitly null: the service should auto-fill it.
      const existing = buildArticle({
        status: ArticleStatus.REGISTERING,
        publishedAt: undefined,
      });
      mockArticleModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      const before = new Date();
      await service.update(
        FIXED_ARTICLE_ID,
        { status: ArticleStatus.ACTIVE },
        superAdmin,
      );
      const after = new Date();

      // Repeatable: just assert the boundary (timestamp now between before
      // and after). Hardcoding the exact value would make the test depend on
      // wall-clock time and break Repeatable.
      const stamp = new Date(existing.publishedAt);
      expect(stamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(stamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('preserves the existing publishedAt when activating without an explicit date and the row already has one', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildArticle({
        status: ArticleStatus.REGISTERING,
        publishedAt: new Date(FIXED_PUBLISHED_AT),
      });
      mockArticleModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_ARTICLE_ID,
        { status: ArticleStatus.ACTIVE },
        superAdmin,
      );

      expect(existing.publishedAt.toISOString()).toBe(FIXED_PUBLISHED_AT);
    });
  });

  describe('delete', () => {
    it('soft-deletes article by setting status to DELETED', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildArticle({ status: ArticleStatus.ACTIVE });
      mockArticleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const result = await service.delete(FIXED_ARTICLE_ID, superAdmin);

      expect(result).toEqual({ success: true });
      expect(existing.status).toBe(ArticleStatus.DELETED);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for a malformed ObjectId without hitting DB', async () => {
      await expect(
        service.delete('not-a-mongo-id', buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
      expect(mockArticleModel.findById).not.toHaveBeenCalled();
    });

    it('blocks province admin from deleting post in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildArticle({
        category: ArticleCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockArticleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.delete(FIXED_ARTICLE_ID, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
      expect(existing.save).not.toHaveBeenCalled();
    });
  });
});

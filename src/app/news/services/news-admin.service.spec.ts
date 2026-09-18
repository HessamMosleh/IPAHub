import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NewsAdminService } from './news-admin.service';
import { News, NewsCategory, NewsStatus } from '../news.schema';
import { Province } from '../../../common/schemas/province.schema';
import {
  buildNewsModelMock,
  buildProvinceModelMock,
  buildNews,
  buildQueryChain,
  buildSuperAdminUser,
  buildProvinceAdminUser,
  FIXED_NEWS_ID,
  FIXED_PROVINCE_ID,
  OTHER_PROVINCE_ID,
  FIXED_PUBLISHED_AT,
} from './__test-helpers__/news-test-fixtures';

describe('NewsAdminService', () => {
  let service: NewsAdminService;
  let mockNewsModel: ReturnType<typeof buildNewsModelMock>;
  let mockProvinceModel: ReturnType<typeof buildProvinceModelMock>;

  // Independent: every test gets a fresh TestingModule and fresh mocks.
  beforeEach(async () => {
    mockNewsModel = buildNewsModelMock();
    mockProvinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsAdminService,
        {
          provide: getModelToken(News.name),
          useValue: mockNewsModel,
        },
        {
          provide: getModelToken(Province.name),
          useValue: mockProvinceModel,
        },
      ],
    }).compile();

    service = module.get<NewsAdminService>(NewsAdminService);
  });

  // No "is defined" tautology — it adds no real validation (Self-validating).

  describe('findAll', () => {
    it('returns all news posts for super admin without province restrictions', async () => {
      const n1 = buildNews();
      mockNewsModel.find.mockReturnValue(buildQueryChain([n1]));
      mockNewsModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const superAdmin = buildSuperAdminUser();
      const result = await service.findAll({}, superAdmin);

      expect(result.data).toEqual([n1]);
      const filter = (
        mockNewsModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // No scoping clause is set for super admin.
      expect(filter.province).toBeUndefined();
      expect(filter.category).toBeUndefined();
    });

    it('scopes query to managed provinces for province admin', async () => {
      mockNewsModel.find.mockReturnValue(buildQueryChain([]));
      mockNewsModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      await service.findAll({}, provinceAdmin);

      const filter = (
        mockNewsModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // Province admins can ONLY see provincial posts in their scope.
      expect(filter.category).toBe(NewsCategory.PROVINCIAL);
      expect(filter.province).toBeDefined();
    });

    it('throws ForbiddenException if province admin queries an unmanaged province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.findAll({ province: OTHER_PROVINCE_ID }, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('filters by publication status', async () => {
      mockNewsModel.find.mockReturnValue(buildQueryChain([]));
      mockNewsModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ status: NewsStatus.REGISTERING });

      const filter = (
        mockNewsModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(NewsStatus.REGISTERING);
    });
  });

  describe('findById', () => {
    it('returns news post for super admin', async () => {
      const post = buildNews();
      mockNewsModel.findById.mockReturnValue(buildQueryChain(post));

      const result = await service.findById(
        FIXED_NEWS_ID,
        buildSuperAdminUser(),
      );
      expect(result).toEqual(post);
    });

    it('returns provincial news post for authorized province admin', async () => {
      const post = buildNews({
        category: NewsCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockNewsModel.findById.mockReturnValue(buildQueryChain(post));

      const result = await service.findById(
        FIXED_NEWS_ID,
        buildProvinceAdminUser([FIXED_PROVINCE_ID]),
      );
      expect(result).toEqual(post);
    });

    it('throws ForbiddenException if province admin accesses post in another province', async () => {
      const post = buildNews({
        category: NewsCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockNewsModel.findById.mockReturnValue(buildQueryChain(post));

      await expect(
        service.findById(
          FIXED_NEWS_ID,
          buildProvinceAdminUser([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if province admin accesses national news in admin view', async () => {
      const post = buildNews({ category: NewsCategory.NATIONAL });
      mockNewsModel.findById.mockReturnValue(buildQueryChain(post));

      await expect(
        service.findById(
          FIXED_NEWS_ID,
          buildProvinceAdminUser([FIXED_PROVINCE_ID]),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if post not found', async () => {
      mockNewsModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findById(FIXED_NEWS_ID, buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for malformed ObjectId without hitting DB', async () => {
      await expect(
        service.findById('not-a-mongo-id', buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
      expect(mockNewsModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('allows super admin to create national news', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildNews({ _id: FIXED_NEWS_ID });
      mockNewsModel.create.mockResolvedValue(createdPost);
      mockNewsModel.findById.mockReturnValue(buildQueryChain(createdPost));

      const result = await service.create(
        {
          title: { en: 'National Event' },
          content: { en: '<p>Content</p>' },
          category: NewsCategory.NATIONAL,
        },
        superAdmin,
      );

      expect(mockNewsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: NewsCategory.NATIONAL,
          province: undefined,
        }),
      );
      expect(result).toBeDefined();
    });

    it('blocks province admin from creating national news', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.create(
          {
            title: { en: 'National Attempt' },
            content: { en: '<p>Content</p>' },
            category: NewsCategory.NATIONAL,
          },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      // Self-validating: also confirm no row was created.
      expect(mockNewsModel.create).not.toHaveBeenCalled();
    });

    it('allows province admin to create news in their managed province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      mockProvinceModel.exists.mockResolvedValue({ _id: FIXED_PROVINCE_ID });

      const createdPost = buildNews({
        _id: FIXED_NEWS_ID,
        category: NewsCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockNewsModel.create.mockResolvedValue(createdPost);
      mockNewsModel.findById.mockReturnValue(buildQueryChain(createdPost));

      const result = await service.create(
        {
          title: { en: 'Provincial Notice' },
          content: { en: '<p>Notice</p>' },
          category: NewsCategory.PROVINCIAL,
          province: FIXED_PROVINCE_ID,
        },
        provinceAdmin,
      );

      expect(mockNewsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: NewsCategory.PROVINCIAL,
        }),
      );
      expect(result).toBeDefined();
    });

    it('blocks province admin from creating news in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);

      await expect(
        service.create(
          {
            title: { en: 'Hijack Notice' },
            content: { en: '<p>Notice</p>' },
            category: NewsCategory.PROVINCIAL,
            province: OTHER_PROVINCE_ID,
          },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockNewsModel.create).not.toHaveBeenCalled();
    });

    it('requires province when category is PROVINCIAL', async () => {
      const superAdmin = buildSuperAdminUser();

      await expect(
        service.create(
          {
            title: { en: 'Notice' },
            content: { en: '<p>Notice</p>' },
            category: NewsCategory.PROVINCIAL,
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
            category: NewsCategory.PROVINCIAL,
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
            category: NewsCategory.PROVINCIAL,
            province: FIXED_PROVINCE_ID,
          },
          superAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sanitizes script tags from English content on write', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildNews({ _id: FIXED_NEWS_ID });
      mockNewsModel.create.mockResolvedValue(createdPost);
      mockNewsModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'Security Test' },
          content: { en: '<p>Safe</p><script>alert("XSS")</script>' },
          category: NewsCategory.NATIONAL,
        },
        superAdmin,
      );

      const createArg = (
        mockNewsModel.create.mock.calls[0] as unknown as [
          { content: { en: string; fa?: string } },
        ]
      )[0];
      expect(createArg.content.en).not.toContain('<script>');
      expect(createArg.content.en).toContain('<p>Safe</p>');
    });

    it('sanitizes iframes from Persian content on write', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildNews({ _id: FIXED_NEWS_ID });
      mockNewsModel.create.mockResolvedValue(createdPost);
      mockNewsModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'Security Test' },
          content: {
            en: '<p>Safe</p>',
            fa: '<p>امن</p><iframe src="malicious"></iframe>',
          },
          category: NewsCategory.NATIONAL,
        },
        superAdmin,
      );

      const createArg = (
        mockNewsModel.create.mock.calls[0] as unknown as [
          { content: { en: string; fa?: string } },
        ]
      )[0];
      expect(createArg.content.fa).not.toContain('<iframe');
      expect(createArg.content.fa).toContain('<p>امن</p>');
    });

    it('sets status from the published boolean when status is not provided', async () => {
      const superAdmin = buildSuperAdminUser();
      const createdPost = buildNews({ _id: FIXED_NEWS_ID });
      mockNewsModel.create.mockResolvedValue(createdPost);
      mockNewsModel.findById.mockReturnValue(buildQueryChain(createdPost));

      await service.create(
        {
          title: { en: 'T' },
          content: { en: '<p>c</p>' },
          category: NewsCategory.NATIONAL,
          published: true,
        },
        superAdmin,
      );

      const createArg = (
        mockNewsModel.create.mock.calls[0] as unknown as [
          { status: NewsStatus },
        ]
      )[0];
      expect(createArg.status).toBe(NewsStatus.ACTIVE);
    });
  });

  describe('update', () => {
    it('updates news post for super admin', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildNews();
      mockNewsModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_NEWS_ID,
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
      expect(mockNewsModel.findById).not.toHaveBeenCalled();
    });

    it('blocks province admin from editing post in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildNews({
        category: NewsCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockNewsModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.update(
          FIXED_NEWS_ID,
          { title: { en: 'Attempt' } },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks province admin from changing category to national', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildNews({
        category: NewsCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });
      mockNewsModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.update(
          FIXED_NEWS_ID,
          { category: NewsCategory.NATIONAL },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sanitizes incoming content on update', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildNews();
      mockNewsModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_NEWS_ID,
        { content: { en: '<p>safe</p><script>alert(1)</script>' } },
        superAdmin,
      );

      expect(existing.content.en).not.toContain('<script>');
      expect(existing.content.en).toContain('<p>safe</p>');
    });

    it('sets publishedAt to now when status moves to ACTIVE without an explicit date and no prior publishedAt', async () => {
      const superAdmin = buildSuperAdminUser();
      // publishedAt explicitly null: the service should auto-fill it.
      const existing = buildNews({
        status: NewsStatus.REGISTERING,
        publishedAt: undefined,
      });
      mockNewsModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      const before = new Date();
      await service.update(
        FIXED_NEWS_ID,
        { status: NewsStatus.ACTIVE },
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
      const existing = buildNews({
        status: NewsStatus.REGISTERING,
        publishedAt: new Date(FIXED_PUBLISHED_AT),
      });
      mockNewsModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(existing) })
        .mockReturnValueOnce(buildQueryChain(existing));

      await service.update(
        FIXED_NEWS_ID,
        { status: NewsStatus.ACTIVE },
        superAdmin,
      );

      expect(existing.publishedAt.toISOString()).toBe(FIXED_PUBLISHED_AT);
    });
  });

  describe('delete', () => {
    it('soft-deletes news post by setting status to DELETED', async () => {
      const superAdmin = buildSuperAdminUser();
      const existing = buildNews({ status: NewsStatus.ACTIVE });
      mockNewsModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const result = await service.delete(FIXED_NEWS_ID, superAdmin);

      expect(result).toEqual({ success: true });
      expect(existing.status).toBe(NewsStatus.DELETED);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for a malformed ObjectId without hitting DB', async () => {
      await expect(
        service.delete('not-a-mongo-id', buildSuperAdminUser()),
      ).rejects.toThrow(NotFoundException);
      expect(mockNewsModel.findById).not.toHaveBeenCalled();
    });

    it('blocks province admin from deleting post in another province', async () => {
      const provinceAdmin = buildProvinceAdminUser([FIXED_PROVINCE_ID]);
      const existing = buildNews({
        category: NewsCategory.PROVINCIAL,
        province: OTHER_PROVINCE_ID,
      });
      mockNewsModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await expect(
        service.delete(FIXED_NEWS_ID, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
      expect(existing.save).not.toHaveBeenCalled();
    });
  });
});

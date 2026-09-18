import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import { News, NewsCategory, NewsStatus } from '../news.schema';
import {
  buildNewsModelMock,
  buildNews,
  buildQueryChain,
  FIXED_NEWS_ID,
  FIXED_PROVINCE_ID,
} from './__test-helpers__/news-test-fixtures';

describe('NewsService', () => {
  let service: NewsService;
  let mockModel: ReturnType<typeof buildNewsModelMock>;

  // Per-test setup: a fresh module and fresh mock per test makes every test
  // (Independent). There is no global beforeAll or shared mutable state.
  beforeEach(async () => {
    mockModel = buildNewsModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: getModelToken(News.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
  });

  // No "is defined" tautology — that adds no real validation (Self-validating).

  describe('findAll', () => {
    it('returns published news with default pagination and an active-status guard', async () => {
      const n1 = buildNews();
      mockModel.find.mockReturnValue(buildQueryChain([n1]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll();

      // The status guard is the public-vs-admin boundary: only ACTIVE posts
      // leak out of the public service. Assert it explicitly.
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: NewsStatus.ACTIVE }),
      );
      expect(mockModel.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: [n1],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('filters by category and province', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        category: NewsCategory.PROVINCIAL,
        province: FIXED_PROVINCE_ID,
      });

      expect(mockModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(NewsStatus.ACTIVE);
      expect(filter.category).toBe(NewsCategory.PROVINCIAL);
      // The province filter is converted to a typed ObjectId — assert that
      // explicitly so a future "I forgot to cast" regression is caught.
      expect(String(filter.province)).toBe(FIXED_PROVINCE_ID);
    });

    it('builds an inclusive UTC date range from fromDate and toDate', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
      });

      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      const range = filter.publishedAt as { $gte: Date; $lte: Date };
      // Assert exact ISO values (Repeatable) rather than just instance type —
      // catches off-by-one-day bugs in end-of-day normalisation.
      expect(range.$gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(range.$lte.toISOString()).toBe('2026-12-31T23:59:59.999Z');
    });

    it('escapes regex metacharacters in the search term before building $or', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ search: 'conference.*' });

      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      // The literal characters that would otherwise form a regex are escaped.
      // This is what stops an attacker from injecting a ReDoS pattern.
      expect(orClause[0]['title.en'].source).toContain('conference\\.\\*');
      expect(orClause[1]['title.fa'].source).toContain('conference\\.\\*');
      expect(orClause[2]['subTitle.en'].source).toContain('conference\\.\\*');
      expect(orClause[4]['summery.en'].source).toContain('conference\\.\\*');
      expect(orClause[6]['byline.en'].source).toContain('conference\\.\\*');
    });

    it('omits $or when no search term is provided', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ category: NewsCategory.NATIONAL });

      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.$or).toBeUndefined();
    });

    it('computes totalPages as zero when no results match', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.findAll();

      expect(result.totalPages).toBe(0);
    });
  });

  describe('findById', () => {
    it('returns an active news post by valid MongoDB ObjectId', async () => {
      const item = buildNews();
      mockModel.findOne.mockReturnValue(buildQueryChain(item));

      const result = await service.findById(FIXED_NEWS_ID);

      // The combined filter is the contract: only ACTIVE, by _id, no
      // populate leak of REGISTRATION/DELETED rows.
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_NEWS_ID,
        status: NewsStatus.ACTIVE,
      });
      expect(result).toEqual(item);
    });

    it('throws NotFoundException for a malformed ObjectId without hitting the DB', async () => {
      // Repeatable: works regardless of DB state, no I/O.
      await expect(service.findById('invalid-mongo-id')).rejects.toThrow(
        NotFoundException,
      );
      // Self-validating: also assert the DB was not touched.
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no row matches', async () => {
      mockModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_NEWS_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the row exists but status is not ACTIVE', async () => {
      // The service-level `status: ACTIVE` guard is what filters out
      // REGISTERING drafts — simulate that by returning null.
      mockModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_NEWS_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('idempotent pagination defaults', () => {
    it('uses page=1, limit=20 when no query is provided', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});

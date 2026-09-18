import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommunityServiceAdminService } from './community-service-admin.service';
import { CommunityService } from '../community-service.schema';
import { ReorderDirection } from '../dtos/reorder-community-service.dto';
import { DEFAULT_COMMUNITY_SERVICES } from '../constants/default-community-services';
import {
  buildCommunityServiceModelMock,
  buildCommunityService,
  buildCreateCommunityServiceDto,
  buildQueryChain,
  FIXED_SERVICE_ID,
  FIXED_SERVICE_ID_2,
  FIXED_SERVICE_ID_3,
} from './__test-helpers__/community-service-test-fixtures';

describe('CommunityServiceAdminService', () => {
  let service: CommunityServiceAdminService;
  let mockModel: ReturnType<typeof buildCommunityServiceModelMock>;

  beforeEach(async () => {
    mockModel = buildCommunityServiceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityServiceAdminService,
        {
          provide: getModelToken(CommunityService.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<CommunityServiceAdminService>(
      CommunityServiceAdminService,
    );
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated community services with default page and limit', async () => {
      const s1 = buildCommunityService({ order: 0 });
      mockModel.find.mockReturnValue(buildQueryChain([s1]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll();

      expect(result).toEqual({
        data: [s1],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('filters by search keyword and applies custom pagination', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.findAll({
        page: 2,
        limit: 10,
        search: 'advocacy.*',
      });

      // Independence: only one call to find() per test — no shared state.
      expect(mockModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // The literal characters that would otherwise form a regex are escaped.
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      expect(orClause[0]['title.en'].source).toContain('advocacy\\.\\*');
      expect(orClause[1]['title.fa'].source).toContain('advocacy\\.\\*');
      expect(orClause[2]['description.en'].source).toContain('advocacy\\.\\*');
      expect(orClause[3]['description.fa'].source).toContain('advocacy\\.\\*');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findById', () => {
    it('returns community service by valid id', async () => {
      const item = buildCommunityService();
      mockModel.findById.mockReturnValue(buildQueryChain(item));

      const result = await service.findById(FIXED_SERVICE_ID);

      expect(result).toEqual(item);
    });

    it('throws NotFoundException on invalid ObjectId', async () => {
      await expect(service.findById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when item not found', async () => {
      mockModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_SERVICE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates community service with auto-assigned order if not provided', async () => {
      mockModel.findOne.mockReturnValue(
        buildQueryChain(buildCommunityService({ order: 5 })),
      );
      mockModel.create.mockResolvedValue(
        buildCommunityService({
          title: { en: 'New Service', fa: 'خدمت جدید' },
          order: 6,
        }),
      );

      const dto = buildCreateCommunityServiceDto();
      const result = await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith({
        title: { en: 'New Service', fa: 'خدمت جدید' },
        description: {
          en: 'New Service Description',
          fa: 'توضیحات خدمت جدید',
        },
        order: 6,
      });
      expect(result.order).toBe(6);
    });

    it('creates community service with explicit order', async () => {
      mockModel.create.mockResolvedValue(
        buildCommunityService({
          title: { en: 'Custom', fa: 'سفارشی' },
          order: 2,
        }),
      );

      const dto = buildCreateCommunityServiceDto({
        title: { en: 'Custom', fa: 'سفارشی' },
        order: 2,
      });
      await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith({
        title: { en: 'Custom', fa: 'سفارشی' },
        description: {
          en: 'New Service Description',
          fa: 'توضیحات خدمت جدید',
        },
        order: 2,
      });
    });
  });

  describe('update', () => {
    it('updates title, description, and order', async () => {
      const existing = buildCommunityService();
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.update(FIXED_SERVICE_ID, {
        title: { en: 'Updated Title', fa: 'عنوان به‌روزشده' },
        description: { en: 'Updated Desc', fa: 'توضیحات به‌روزشده' },
        order: 3,
      });

      expect(existing.title).toEqual({
        en: 'Updated Title',
        fa: 'عنوان به‌روزشده',
      });
      expect(existing.description).toEqual({
        en: 'Updated Desc',
        fa: 'توضیحات به‌روزشده',
      });
      expect(existing.order).toBe(3);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException on invalid ObjectId', async () => {
      await expect(service.update('bad-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if community service does not exist', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(FIXED_SERVICE_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    it('swaps order with adjacent item when moving UP', async () => {
      const s1 = buildCommunityService({ _id: FIXED_SERVICE_ID, order: 0 });
      const s2 = buildCommunityService({ _id: FIXED_SERVICE_ID_2, order: 1 });
      const s3 = buildCommunityService({ _id: FIXED_SERVICE_ID_3, order: 2 });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([s1, s2, s3]),
        }),
      });
      mockModel.findByIdAndUpdate.mockResolvedValue(true);
      mockModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([s1, s2, s3]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([s2, s1, s3]),
          }),
        });

      const result = await service.reorder(FIXED_SERVICE_ID_2, {
        dir: ReorderDirection.UP,
      });

      // Self-validating: each expectation proves a specific outcome.
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_SERVICE_ID_2,
        { order: 0 },
      );
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_SERVICE_ID,
        { order: 1 },
      );
      // The post-update read returns the swapped ordering.
      expect(result).toEqual([s2, s1, s3]);
    });

    it('swaps order with adjacent item when moving DOWN', async () => {
      const s1 = buildCommunityService({ _id: FIXED_SERVICE_ID, order: 0 });
      const s2 = buildCommunityService({ _id: FIXED_SERVICE_ID_2, order: 1 });

      mockModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([s1, s2]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([s2, s1]),
          }),
        });
      mockModel.findByIdAndUpdate.mockResolvedValue(true);

      const result = await service.reorder(FIXED_SERVICE_ID, {
        dir: ReorderDirection.DOWN,
      });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_SERVICE_ID,
        { order: 1 },
      );
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_SERVICE_ID_2,
        { order: 0 },
      );
      // Self-validating: same swap is visible in the returned ordering.
      expect(result).toEqual([s2, s1]);
    });

    it('throws BadRequestException when moving UP from top', async () => {
      const s1 = buildCommunityService({ _id: FIXED_SERVICE_ID, order: 0 });
      const s2 = buildCommunityService({ _id: FIXED_SERVICE_ID_2, order: 1 });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([s1, s2]),
        }),
      });

      await expect(
        service.reorder(FIXED_SERVICE_ID, { dir: ReorderDirection.UP }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when moving DOWN from bottom', async () => {
      const s1 = buildCommunityService({ _id: FIXED_SERVICE_ID, order: 0 });
      const s2 = buildCommunityService({ _id: FIXED_SERVICE_ID_2, order: 1 });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([s1, s2]),
        }),
      });

      await expect(
        service.reorder(FIXED_SERVICE_ID_2, { dir: ReorderDirection.DOWN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if target item is not in the list', async () => {
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.reorder(FIXED_SERVICE_ID, { dir: ReorderDirection.UP }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes community service by id', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildCommunityService()),
      });

      const result = await service.delete(FIXED_SERVICE_ID);

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_SERVICE_ID,
      );
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException on invalid ObjectId', async () => {
      await expect(service.delete('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if item not found for deletion', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete(FIXED_SERVICE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('seed', () => {
    it('seeds canonical default services if they do not exist', async () => {
      mockModel.findOne.mockResolvedValue(null);
      mockModel.create.mockResolvedValue(true);
      mockModel.countDocuments.mockResolvedValue(
        DEFAULT_COMMUNITY_SERVICES.length,
      );

      const result = await service.seed();

      // Self-validating: prove the count AND that every canonical service
      // was created with the exact expected title — not just any content.
      expect(mockModel.create).toHaveBeenCalledTimes(
        DEFAULT_COMMUNITY_SERVICES.length,
      );
      const createdTitles = (
        mockModel.create.mock.calls as Array<[{ title: { en: string } }]>
      ).map((c) => c[0].title.en);
      const expectedTitles = DEFAULT_COMMUNITY_SERVICES.map((s) => s.title.en);
      expect(createdTitles).toEqual(expectedTitles);
      expect(result).toEqual({
        seeded: DEFAULT_COMMUNITY_SERVICES.length,
        total: DEFAULT_COMMUNITY_SERVICES.length,
      });
    });

    it('skips already existing services by English title', async () => {
      mockModel.findOne.mockResolvedValue(buildCommunityService());
      mockModel.countDocuments.mockResolvedValue(4);

      const result = await service.seed();

      expect(mockModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        seeded: 0,
        total: 4,
      });
    });
  });
});

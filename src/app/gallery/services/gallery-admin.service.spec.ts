import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GalleryAdminService } from './gallery-admin.service';
import { GalleryImage } from '../gallery-image.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { ReorderDirection } from '../dtos/reorder-gallery-image.dto';
import { DEFAULT_GALLERY_IMAGES } from '../constants/default-gallery-images';
import {
  buildGalleryImageModelMock,
  buildGalleryImage,
  buildCreateGalleryImageDto,
  buildQueryChain,
  FIXED_GALLERY_ID,
  FIXED_GALLERY_ID_2,
  FIXED_GALLERY_ID_3,
} from './__test-helpers__/gallery-test-fixtures';

describe('GalleryAdminService', () => {
  let service: GalleryAdminService;
  let mockModel: ReturnType<typeof buildGalleryImageModelMock>;

  beforeEach(async () => {
    mockModel = buildGalleryImageModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryAdminService,
        {
          provide: getModelToken(GalleryImage.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<GalleryAdminService>(GalleryAdminService);
  });

  describe('findAll', () => {
    it('returns paginated gallery images with default page and limit', async () => {
      const g1 = buildGalleryImage({ order: 0 });
      mockModel.find.mockReturnValue(buildQueryChain([g1]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll();

      expect(result).toEqual({
        data: [g1],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('filters by status and search keyword and applies custom pagination', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.findAll({
        page: 2,
        limit: 10,
        status: ActiveStatus.DISABLED,
        search: 'conference.*',
      });

      expect(mockModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(ActiveStatus.DISABLED);
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      expect(orClause[0]['caption.en'].source).toContain('conference\\.\\*');
      expect(orClause[1]['caption.fa'].source).toContain('conference\\.\\*');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findById', () => {
    it('returns a gallery image by id', async () => {
      const item = buildGalleryImage();
      mockModel.findById.mockReturnValue(buildQueryChain(item));

      const result = await service.findById(FIXED_GALLERY_ID);

      expect(mockModel.findById).toHaveBeenCalledWith(FIXED_GALLERY_ID);
      expect(result).toEqual(item);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(service.findById('not-valid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when image does not exist', async () => {
      mockModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_GALLERY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a new gallery image with auto-assigned order if omitted', async () => {
      const dto = buildCreateGalleryImageDto();
      mockModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ order: 4 }),
          }),
        }),
      });

      const createdItem = buildGalleryImage({ order: 5 });
      mockModel.create.mockResolvedValue(createdItem);

      const result = await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          image: expect.objectContaining({
            key: dto.image.key,
          }),
          caption: {
            en: 'Banner title',
            fa: 'عنوان بنر',
          },
          order: 5,
          status: ActiveStatus.ACTIVE,
        }),
      );
      expect(result).toEqual(createdItem);
    });

    it('sets order to 0 when no prior gallery images exist', async () => {
      const dto = buildCreateGalleryImageDto();
      mockModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      mockModel.create.mockResolvedValue(buildGalleryImage({ order: 0 }));

      await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 0,
        }),
      );
    });

    it('creates with explicit order and disabled status', async () => {
      const dto = buildCreateGalleryImageDto({
        order: 10,
        status: ActiveStatus.DISABLED,
      });

      mockModel.create.mockResolvedValue(
        buildGalleryImage({ order: 10, status: ActiveStatus.DISABLED }),
      );

      await service.create(dto);

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 10,
          status: ActiveStatus.DISABLED,
        }),
      );
    });
  });

  describe('update', () => {
    it('updates image, caption, order, and status', async () => {
      const existing = buildGalleryImage();
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const dto = {
        image: {
          key: 'new-key.jpg',
        },
        caption: {
          en: 'Updated title',
          fa: 'عنوان بروزرسانی شده',
        },
        order: 3,
        status: ActiveStatus.DISABLED,
      };

      await service.update(FIXED_GALLERY_ID, dto);

      expect(existing.image.key).toBe('new-key.jpg');
      expect(existing.caption?.en).toBe('Updated title');
      expect(existing.order).toBe(3);
      expect(existing.status).toBe(ActiveStatus.DISABLED);
      expect(existing.save).toHaveBeenCalled();
    });

    it('clears caption when null or empty strings passed', async () => {
      const existing = buildGalleryImage();
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.update(FIXED_GALLERY_ID, {
        caption: { en: '', fa: '' },
      });

      expect(existing.caption).toBeUndefined();
      expect(existing.save).toHaveBeenCalled();
    });

    it('preserves untouched fields during partial update (only order changed)', async () => {
      const existing = buildGalleryImage({ order: 0 });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.update(FIXED_GALLERY_ID, { order: 7 });

      expect(existing.order).toBe(7);
      expect(existing.image.key).toBe('seed/banner-association.svg');
      expect(existing.caption?.en).toBe('Industrial Consultants Association');
      expect(existing.status).toBe(ActiveStatus.ACTIVE);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for invalid ObjectId', async () => {
      await expect(service.update('invalid-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when image does not exist', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update(FIXED_GALLERY_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleStatus', () => {
    it('toggles ACTIVE to DISABLED', async () => {
      const existing = buildGalleryImage({ status: ActiveStatus.ACTIVE });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.toggleStatus(FIXED_GALLERY_ID);

      expect(existing.status).toBe(ActiveStatus.DISABLED);
      expect(existing.save).toHaveBeenCalled();
    });

    it('toggles DISABLED to ACTIVE', async () => {
      const existing = buildGalleryImage({ status: ActiveStatus.DISABLED });
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.toggleStatus(FIXED_GALLERY_ID);

      expect(existing.status).toBe(ActiveStatus.ACTIVE);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException for invalid ObjectId', async () => {
      await expect(service.toggleStatus('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when image does not exist', async () => {
      mockModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.toggleStatus(FIXED_GALLERY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    it('swaps order with adjacent item moving UP', async () => {
      const g1 = buildGalleryImage({
        _id: FIXED_GALLERY_ID,
        order: 0,
      });
      const g2 = buildGalleryImage({
        _id: FIXED_GALLERY_ID_2,
        order: 1,
      });

      mockModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g1, g2]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g2, g1]),
          }),
        });

      mockModel.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.reorder(FIXED_GALLERY_ID_2, {
        dir: ReorderDirection.UP,
      });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID_2,
        { order: 0 },
      );
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID,
        { order: 1 },
      );
      expect(result).toEqual([g2, g1]);
    });

    it('swaps order with adjacent item moving DOWN', async () => {
      const g1 = buildGalleryImage({
        _id: FIXED_GALLERY_ID,
        order: 0,
      });
      const g2 = buildGalleryImage({
        _id: FIXED_GALLERY_ID_2,
        order: 1,
      });

      mockModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g1, g2]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g2, g1]),
          }),
        });

      mockModel.findByIdAndUpdate.mockResolvedValue({});

      await service.reorder(FIXED_GALLERY_ID, {
        dir: ReorderDirection.DOWN,
      });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID,
        { order: 1 },
      );
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID_2,
        { order: 0 },
      );
    });

    it('assigns index-based order when both items shared identical order values', async () => {
      const g1 = buildGalleryImage({
        _id: FIXED_GALLERY_ID,
        order: 0,
      });
      const g2 = buildGalleryImage({
        _id: FIXED_GALLERY_ID_2,
        order: 0,
      });

      mockModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g1, g2]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([g2, g1]),
          }),
        });

      mockModel.findByIdAndUpdate.mockResolvedValue({});

      await service.reorder(FIXED_GALLERY_ID_2, {
        dir: ReorderDirection.UP,
      });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID_2,
        { order: 0 },
      );
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_GALLERY_ID,
        { order: 1 },
      );
    });

    it('throws BadRequestException when moving the first item UP', async () => {
      const g1 = buildGalleryImage({ _id: FIXED_GALLERY_ID, order: 0 });
      const g2 = buildGalleryImage({ _id: FIXED_GALLERY_ID_2, order: 1 });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([g1, g2]),
        }),
      });

      await expect(
        service.reorder(FIXED_GALLERY_ID, { dir: ReorderDirection.UP }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when moving the last item DOWN', async () => {
      const g1 = buildGalleryImage({ _id: FIXED_GALLERY_ID, order: 0 });
      const g2 = buildGalleryImage({ _id: FIXED_GALLERY_ID_2, order: 1 });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([g1, g2]),
        }),
      });

      await expect(
        service.reorder(FIXED_GALLERY_ID_2, { dir: ReorderDirection.DOWN }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when image does not exist in collection', async () => {
      const g1 = buildGalleryImage({ _id: FIXED_GALLERY_ID });

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([g1]),
        }),
      });

      await expect(
        service.reorder(FIXED_GALLERY_ID_3, { dir: ReorderDirection.UP }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(
        service.reorder('not-an-id', { dir: ReorderDirection.UP }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a gallery image by id', async () => {
      const item = buildGalleryImage();
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(item),
      });

      const result = await service.delete(FIXED_GALLERY_ID);

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_GALLERY_ID,
      );
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException for invalid ObjectId', async () => {
      await expect(service.delete('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when image does not exist', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete(FIXED_GALLERY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('seed', () => {
    it('seeds canonical default gallery images when not present', async () => {
      mockModel.findOne.mockResolvedValue(null);
      mockModel.create.mockResolvedValue({});
      mockModel.countDocuments.mockResolvedValue(DEFAULT_GALLERY_IMAGES.length);

      const result = await service.seed();

      expect(mockModel.create).toHaveBeenCalledTimes(
        DEFAULT_GALLERY_IMAGES.length,
      );
      expect(result).toEqual({
        seeded: DEFAULT_GALLERY_IMAGES.length,
        total: DEFAULT_GALLERY_IMAGES.length,
      });
    });

    it('skips existing images and reports 0 seeded when already present', async () => {
      mockModel.findOne.mockResolvedValue({ _id: FIXED_GALLERY_ID });
      mockModel.countDocuments.mockResolvedValue(DEFAULT_GALLERY_IMAGES.length);

      const result = await service.seed();

      expect(mockModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        seeded: 0,
        total: DEFAULT_GALLERY_IMAGES.length,
      });
    });
  });
});

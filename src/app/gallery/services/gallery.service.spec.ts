import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryImage } from '../gallery-image.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildGalleryImageModelMock,
  buildGalleryImage,
  buildQueryChain,
  FIXED_GALLERY_ID,
  FIXED_GALLERY_ID_2,
} from './__test-helpers__/gallery-test-fixtures';

describe('GalleryService', () => {
  let service: GalleryService;
  let mockModel: ReturnType<typeof buildGalleryImageModelMock>;

  beforeEach(async () => {
    mockModel = buildGalleryImageModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        {
          provide: getModelToken(GalleryImage.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<GalleryService>(GalleryService);
  });

  describe('findAllActive', () => {
    it('returns all active gallery images sorted by order ascending', async () => {
      const g1 = buildGalleryImage({ order: 0 });
      const g2 = buildGalleryImage({
        _id: FIXED_GALLERY_ID_2,
        order: 1,
      });

      mockModel.find.mockReturnValue(buildQueryChain([g1, g2]));

      const result = await service.findAllActive();

      expect(mockModel.find).toHaveBeenCalledWith({
        status: ActiveStatus.ACTIVE,
      });
      expect(result).toEqual([g1, g2]);
    });

    it('applies search filter across caption English and Persian regex', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));

      await service.findAllActive({ search: 'conference.*' });

      expect(mockModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(ActiveStatus.ACTIVE);
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      expect(orClause[0]['caption.en'].source).toContain('conference\\.\\*');
      expect(orClause[1]['caption.fa'].source).toContain('conference\\.\\*');
    });

    it('skips search filter when keyword is whitespace-only', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));

      await service.findAllActive({ search: '   ' });

      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.status).toBe(ActiveStatus.ACTIVE);
      expect(filter.$or).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns an active gallery image by valid MongoDB ObjectId', async () => {
      const item = buildGalleryImage();
      mockModel.findOne.mockReturnValue(buildQueryChain(item));

      const result = await service.findById(FIXED_GALLERY_ID);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_GALLERY_ID,
        status: ActiveStatus.ACTIVE,
      });
      expect(result).toEqual(item);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when image does not exist or is inactive', async () => {
      mockModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_GALLERY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GalleryController } from './gallery.controller';
import { GalleryService } from '../services/gallery.service';
import {
  buildGalleryImage,
  FIXED_GALLERY_ID,
} from '../services/__test-helpers__/gallery-test-fixtures';

describe('GalleryController', () => {
  let controller: GalleryController;
  let mockService: {
    findAllActive: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findAllActive: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GalleryController],
      providers: [
        {
          provide: GalleryService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GalleryController>(GalleryController);
  });

  it('passes the public query dto through to GalleryService.findAllActive', async () => {
    const item = buildGalleryImage();
    mockService.findAllActive.mockResolvedValue([item]);

    const query = { search: 'conference' };
    const result = await controller.findAll(query);

    expect(mockService.findAllActive).toHaveBeenCalledTimes(1);
    expect(mockService.findAllActive).toHaveBeenCalledWith(query);
    expect(result).toEqual([item]);
  });

  it('forwards the id param to GalleryService.findById', async () => {
    const item = buildGalleryImage();
    mockService.findById.mockResolvedValue(item);

    const result = await controller.findById(FIXED_GALLERY_ID);

    expect(mockService.findById).toHaveBeenCalledTimes(1);
    expect(mockService.findById).toHaveBeenCalledWith(FIXED_GALLERY_ID);
    expect(result).toEqual(item);
  });

  it('propagates service errors to the caller (no swallowing)', async () => {
    const err = new Error('not found');
    mockService.findById.mockRejectedValue(err);

    await expect(controller.findById(FIXED_GALLERY_ID)).rejects.toBe(err);
  });
});

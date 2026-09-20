import { Test, TestingModule } from '@nestjs/testing';
import { GalleryAdminController } from './gallery-admin.controller';
import { GalleryAdminService } from '../services/gallery-admin.service';
import {
  buildGalleryImage,
  buildCreateGalleryImageDto,
  FIXED_GALLERY_ID,
} from '../services/__test-helpers__/gallery-test-fixtures';
import { ReorderDirection } from '../dtos/reorder-gallery-image.dto';

describe('GalleryAdminController', () => {
  let controller: GalleryAdminController;
  let mockAdminService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    toggleStatus: jest.Mock;
    reorder: jest.Mock;
    delete: jest.Mock;
    seed: jest.Mock;
  };

  beforeEach(async () => {
    mockAdminService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      toggleStatus: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
      seed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GalleryAdminController],
      providers: [
        {
          provide: GalleryAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<GalleryAdminController>(GalleryAdminController);
  });

  it('forwards query to GalleryAdminService.findAll', async () => {
    const item = buildGalleryImage();
    const mockResult = {
      data: [item],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    mockAdminService.findAll.mockResolvedValue(mockResult);

    const query = { page: 1, limit: 50 };
    const result = await controller.findAll(query);

    expect(mockAdminService.findAll).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResult);
  });

  it('forwards to GalleryAdminService.seed', async () => {
    mockAdminService.seed.mockResolvedValue({ seeded: 5, total: 5 });

    const result = await controller.seed();

    expect(mockAdminService.seed).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ seeded: 5, total: 5 });
  });

  it('forwards id to GalleryAdminService.findById', async () => {
    const item = buildGalleryImage();
    mockAdminService.findById.mockResolvedValue(item);

    const result = await controller.findById(FIXED_GALLERY_ID);

    expect(mockAdminService.findById).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findById).toHaveBeenCalledWith(FIXED_GALLERY_ID);
    expect(result).toEqual(item);
  });

  it('forwards dto to GalleryAdminService.create', async () => {
    const item = buildGalleryImage();
    mockAdminService.create.mockResolvedValue(item);
    const dto = buildCreateGalleryImageDto();

    const result = await controller.create(dto);

    expect(mockAdminService.create).toHaveBeenCalledTimes(1);
    expect(mockAdminService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(item);
  });

  it('forwards (id, dto) to GalleryAdminService.update', async () => {
    const item = buildGalleryImage();
    mockAdminService.update.mockResolvedValue(item);
    const dto = { caption: { en: 'Updated' } };

    const result = await controller.update(FIXED_GALLERY_ID, dto);

    expect(mockAdminService.update).toHaveBeenCalledTimes(1);
    expect(mockAdminService.update).toHaveBeenCalledWith(
      FIXED_GALLERY_ID,
      dto,
    );
    expect(result).toEqual(item);
  });

  it('forwards id to GalleryAdminService.toggleStatus', async () => {
    const item = buildGalleryImage();
    mockAdminService.toggleStatus.mockResolvedValue(item);

    const result = await controller.toggleStatus(FIXED_GALLERY_ID);

    expect(mockAdminService.toggleStatus).toHaveBeenCalledTimes(1);
    expect(mockAdminService.toggleStatus).toHaveBeenCalledWith(
      FIXED_GALLERY_ID,
    );
    expect(result).toEqual(item);
  });

  it('forwards (id, dto) to GalleryAdminService.reorder', async () => {
    const items = [buildGalleryImage()];
    mockAdminService.reorder.mockResolvedValue(items);
    const dto = { dir: ReorderDirection.UP };

    const result = await controller.reorder(FIXED_GALLERY_ID, dto);

    expect(mockAdminService.reorder).toHaveBeenCalledTimes(1);
    expect(mockAdminService.reorder).toHaveBeenCalledWith(
      FIXED_GALLERY_ID,
      dto,
    );
    expect(result).toEqual(items);
  });

  it('forwards id to GalleryAdminService.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(FIXED_GALLERY_ID);

    expect(mockAdminService.delete).toHaveBeenCalledTimes(1);
    expect(mockAdminService.delete).toHaveBeenCalledWith(FIXED_GALLERY_ID);
    expect(result).toEqual({ success: true });
  });

  it('does not silently swallow service errors', async () => {
    const err = new Error('boom');
    mockAdminService.findById.mockRejectedValue(err);

    await expect(controller.findById(FIXED_GALLERY_ID)).rejects.toBe(err);
  });

  it('propagates create errors without swallowing', async () => {
    const err = new Error('create failed');
    mockAdminService.create.mockRejectedValue(err);

    await expect(
      controller.create(buildCreateGalleryImageDto()),
    ).rejects.toBe(err);
  });

  it('propagates update errors without swallowing', async () => {
    const err = new Error('update failed');
    mockAdminService.update.mockRejectedValue(err);

    await expect(
      controller.update(FIXED_GALLERY_ID, { order: 1 }),
    ).rejects.toBe(err);
  });

  it('propagates toggleStatus errors without swallowing', async () => {
    const err = new Error('toggle failed');
    mockAdminService.toggleStatus.mockRejectedValue(err);

    await expect(controller.toggleStatus(FIXED_GALLERY_ID)).rejects.toBe(err);
  });

  it('propagates reorder errors without swallowing', async () => {
    const err = new Error('reorder failed');
    mockAdminService.reorder.mockRejectedValue(err);

    await expect(
      controller.reorder(FIXED_GALLERY_ID, { dir: ReorderDirection.UP }),
    ).rejects.toBe(err);
  });

  it('propagates delete errors without swallowing', async () => {
    const err = new Error('delete failed');
    mockAdminService.delete.mockRejectedValue(err);

    await expect(controller.delete(FIXED_GALLERY_ID)).rejects.toBe(err);
  });

  it('forwards empty query to findAll and lets service apply defaults', async () => {
    mockAdminService.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    const result = await controller.findAll({} as any);

    expect(mockAdminService.findAll).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(0);
  });
});

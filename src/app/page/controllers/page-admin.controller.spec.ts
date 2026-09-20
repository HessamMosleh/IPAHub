import { Test, TestingModule } from '@nestjs/testing';
import { PageAdminController } from './page-admin.controller';
import { PageAdminService } from '../services/page-admin.service';
import {
  buildPageDoc,
  FIXED_PAGE_ID,
} from '../services/__test-helpers__/page-test-fixtures';
import { PageKey } from '../page.schema';

describe('PageAdminController', () => {
  let controller: PageAdminController;
  let mockAdminService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findByKey: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    seed: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockAdminService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByKey: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      seed: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageAdminController],
      providers: [
        {
          provide: PageAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<PageAdminController>(PageAdminController);
  });

  it('forwards query to PageAdminService.findAll', async () => {
    const page = buildPageDoc();
    const mockResult = {
      data: [page],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    mockAdminService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(mockAdminService.findAll).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(result).toEqual(mockResult);
  });

  it('calls PageAdminService.seed on seed endpoint', async () => {
    mockAdminService.seed.mockResolvedValue({ seeded: 6, total: 6 });

    const result = await controller.seed();

    expect(mockAdminService.seed).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ seeded: 6, total: 6 });
  });

  it('forwards id to PageAdminService.findById', async () => {
    const page = buildPageDoc();
    mockAdminService.findById.mockResolvedValue(page);

    const result = await controller.findById(FIXED_PAGE_ID);

    expect(mockAdminService.findById).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findById).toHaveBeenCalledWith(FIXED_PAGE_ID);
    expect(result).toEqual(page);
  });

  it('forwards key to PageAdminService.findByKey', async () => {
    const page = buildPageDoc();
    mockAdminService.findByKey.mockResolvedValue(page);

    const result = await controller.findByKey(PageKey.ABOUT_FORUM);

    expect(mockAdminService.findByKey).toHaveBeenCalledTimes(1);
    expect(mockAdminService.findByKey).toHaveBeenCalledWith(
      PageKey.ABOUT_FORUM,
    );
    expect(result).toEqual(page);
  });

  it('forwards key and dto to PageAdminService.save', async () => {
    const page = buildPageDoc();
    mockAdminService.save.mockResolvedValue(page);
    const dto = {
      title: { en: 'About' },
      body: { en: '<p>Content</p>' },
    };

    const result = await controller.save(PageKey.ABOUT_FORUM, dto);

    expect(mockAdminService.save).toHaveBeenCalledTimes(1);
    expect(mockAdminService.save).toHaveBeenCalledWith(
      PageKey.ABOUT_FORUM,
      dto,
    );
    expect(result).toEqual(page);
  });

  it('forwards dto to PageAdminService.create', async () => {
    const page = buildPageDoc();
    mockAdminService.create.mockResolvedValue(page);
    const dto = {
      key: PageKey.MEMORANDUM,
      title: { en: 'Memorandum' },
      body: { en: '<p>Content</p>' },
    };

    const result = await controller.create(dto);

    expect(mockAdminService.create).toHaveBeenCalledTimes(1);
    expect(mockAdminService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(page);
  });

  it('forwards key and dto to PageAdminService.update', async () => {
    const page = buildPageDoc();
    mockAdminService.update.mockResolvedValue(page);
    const dto = { title: { en: 'Updated' } };

    const result = await controller.update(PageKey.ABOUT_FORUM, dto);

    expect(mockAdminService.update).toHaveBeenCalledTimes(1);
    expect(mockAdminService.update).toHaveBeenCalledWith(
      PageKey.ABOUT_FORUM,
      dto,
    );
    expect(result).toEqual(page);
  });

  it('forwards key to PageAdminService.delete', async () => {
    mockAdminService.delete.mockResolvedValue({ success: true });

    const result = await controller.delete(PageKey.ABOUT_FORUM);

    expect(mockAdminService.delete).toHaveBeenCalledTimes(1);
    expect(mockAdminService.delete).toHaveBeenCalledWith(PageKey.ABOUT_FORUM);
    expect(result).toEqual({ success: true });
  });

  it('propagates service errors without swallowing', async () => {
    const err = new Error('boom');
    mockAdminService.findByKey.mockRejectedValue(err);

    await expect(controller.findByKey('unknown')).rejects.toBe(err);
  });
});

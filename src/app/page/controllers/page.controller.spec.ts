import { Test, TestingModule } from '@nestjs/testing';
import { PageController } from './page.controller';
import { PageService } from '../services/page.service';
import {
  buildPageDoc,
  FIXED_PAGE_ID,
} from '../services/__test-helpers__/page-test-fixtures';
import { PageKey } from '../page.schema';

describe('PageController', () => {
  let controller: PageController;
  let mockService: {
    findAll: jest.Mock;
    findByKey: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findByKey: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageController],
      providers: [
        {
          provide: PageService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PageController>(PageController);
  });

  it('passes search query to PageService.findAll', async () => {
    const page = buildPageDoc();
    mockService.findAll.mockResolvedValue([page]);

    const result = await controller.findAll({ search: 'about' });

    expect(mockService.findAll).toHaveBeenCalledTimes(1);
    expect(mockService.findAll).toHaveBeenCalledWith({ search: 'about' });
    expect(result).toEqual([page]);
  });

  it('forwards key param to PageService.findByKey', async () => {
    const page = buildPageDoc();
    mockService.findByKey.mockResolvedValue(page);

    const result = await controller.findByKey(PageKey.ABOUT_FORUM);

    expect(mockService.findByKey).toHaveBeenCalledTimes(1);
    expect(mockService.findByKey).toHaveBeenCalledWith(PageKey.ABOUT_FORUM);
    expect(result).toEqual(page);
  });

  it('forwards id param to PageService.findById', async () => {
    const page = buildPageDoc();
    mockService.findById.mockResolvedValue(page);

    const result = await controller.findById(FIXED_PAGE_ID);

    expect(mockService.findById).toHaveBeenCalledTimes(1);
    expect(mockService.findById).toHaveBeenCalledWith(FIXED_PAGE_ID);
    expect(result).toEqual(page);
  });

  it('propagates service errors to the caller', async () => {
    const err = new Error('boom');
    mockService.findByKey.mockRejectedValue(err);

    await expect(controller.findByKey('unknown')).rejects.toBe(err);
  });
});

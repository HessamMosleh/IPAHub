import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { PageService } from './page.service';
import { Page, PageKey, PageProp } from '../page.schema';
import {
  buildPageDoc,
  buildPageModelMock,
  buildQueryChain,
  FIXED_PAGE_ID,
} from './__test-helpers__/page-test-fixtures';

describe('PageService', () => {
  let service: PageService;
  let pageModel: ReturnType<typeof buildPageModelMock>;
  let mockPage: ReturnType<typeof buildPageDoc>;

  beforeEach(async () => {
    pageModel = buildPageModelMock();
    mockPage = buildPageDoc();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageService,
        {
          provide: getModelToken(Page.name),
          useValue: pageModel,
        },
      ],
    }).compile();

    service = module.get<PageService>(PageService);
  });

  describe('findAll', () => {
    it('returns all pages with general props sorted by key ascending', async () => {
      const chain = buildQueryChain([mockPage]);
      pageModel.find.mockReturnValue(chain);

      const result = await service.findAll();

      expect(pageModel.find).toHaveBeenCalledWith({});
      expect(chain.select).toHaveBeenCalledWith(PageProp.general);
      expect(chain.sort).toHaveBeenCalledWith({ key: 1, createdAt: 1 });
      expect(result).toEqual([mockPage]);
    });

    it('applies search filter with escaped regex across key, title, and body', async () => {
      const chain = buildQueryChain([mockPage]);
      pageModel.find.mockReturnValue(chain);

      const result = await service.findAll({ search: 'about.*forum' });

      expect(pageModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        pageModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      expect(orClause[0].key.source).toContain('about\\.\\*forum');
      expect(orClause[1]['title.en'].source).toContain('about\\.\\*forum');
      expect(orClause[2]['title.fa'].source).toContain('about\\.\\*forum');
      expect(orClause[3]['body.en'].source).toContain('about\\.\\*forum');
      expect(orClause[4]['body.fa'].source).toContain('about\\.\\*forum');
      expect(result).toEqual([mockPage]);
    });
  });

  describe('findByKey', () => {
    it('finds page by key and selects general props', async () => {
      const chain = buildQueryChain(mockPage);
      pageModel.findOne.mockReturnValue(chain);

      const result = await service.findByKey('ABOUT-FORUM ');

      expect(pageModel.findOne).toHaveBeenCalledWith({
        key: PageKey.ABOUT_FORUM,
      });
      expect(chain.select).toHaveBeenCalledWith(PageProp.general);
      expect(result).toEqual(mockPage);
    });

    it('throws NotFoundException when page does not exist', async () => {
      const chain = buildQueryChain(null);
      pageModel.findOne.mockReturnValue(chain);

      await expect(service.findByKey('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('finds page by valid ObjectId and selects general props', async () => {
      const chain = buildQueryChain(mockPage);
      pageModel.findById.mockReturnValue(chain);

      const result = await service.findById(FIXED_PAGE_ID);

      expect(pageModel.findById).toHaveBeenCalledWith(FIXED_PAGE_ID);
      expect(chain.select).toHaveBeenCalledWith(PageProp.general);
      expect(result).toEqual(mockPage);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when page does not exist by id', async () => {
      const chain = buildQueryChain(null);
      pageModel.findById.mockReturnValue(chain);

      await expect(service.findById(FIXED_PAGE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

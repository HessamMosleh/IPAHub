import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PageAdminService } from './page-admin.service';
import { Page, PageKey, PageProp } from '../page.schema';
import { DEFAULT_PAGES } from '../constants/default-pages';
import {
  buildPageDoc,
  buildPageModelMock,
  buildQueryChain,
  FIXED_PAGE_ID,
} from './__test-helpers__/page-test-fixtures';

describe('PageAdminService', () => {
  let service: PageAdminService;
  let pageModel: ReturnType<typeof buildPageModelMock>;
  let mockPage: ReturnType<typeof buildPageDoc>;

  beforeEach(async () => {
    pageModel = buildPageModelMock();
    mockPage = buildPageDoc();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageAdminService,
        {
          provide: getModelToken(Page.name),
          useValue: pageModel,
        },
      ],
    }).compile();

    service = module.get<PageAdminService>(PageAdminService);
  });

  describe('findAll', () => {
    it('returns paginated pages with admin props', async () => {
      const chain = buildQueryChain([mockPage]);
      pageModel.find.mockReturnValue(chain);
      pageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(pageModel.find).toHaveBeenCalledWith({});
      expect(chain.select).toHaveBeenCalledWith(PageProp.admin);
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [mockPage],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('applies search filter across key, title, and body', async () => {
      const chain = buildQueryChain([mockPage]);
      pageModel.find.mockReturnValue(chain);
      pageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await service.findAll({ search: 'goals' });

      expect(pageModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        pageModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      expect(filter.$or).toBeDefined();
    });
  });

  describe('findByKey', () => {
    it('finds page by key with admin props', async () => {
      const chain = buildQueryChain(mockPage);
      pageModel.findOne.mockReturnValue(chain);

      const result = await service.findByKey('about-forum');

      expect(pageModel.findOne).toHaveBeenCalledWith({
        key: PageKey.ABOUT_FORUM,
      });
      expect(chain.select).toHaveBeenCalledWith(PageProp.admin);
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
    it('finds page by valid ObjectId with admin props', async () => {
      const chain = buildQueryChain(mockPage);
      pageModel.findById.mockReturnValue(chain);

      const result = await service.findById(FIXED_PAGE_ID);

      expect(pageModel.findById).toHaveBeenCalledWith(FIXED_PAGE_ID);
      expect(chain.select).toHaveBeenCalledWith(PageProp.admin);
      expect(result).toEqual(mockPage);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when page not found by id', async () => {
      const chain = buildQueryChain(null);
      pageModel.findById.mockReturnValue(chain);

      await expect(service.findById(FIXED_PAGE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('save (upsert)', () => {
    it('creates page on save if not existing and sanitizes rich-text HTML', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      pageModel.create.mockResolvedValue(mockPage);

      const result = await service.save(PageKey.MEMORANDUM, {
        title: { en: 'Memorandum', fa: 'مرام نامه' },
        body: {
          en: '<p>Content</p><script>alert("xss")</script>',
          fa: '<p>متن</p><iframe></iframe>',
        },
      });

      expect(pageModel.create).toHaveBeenCalledWith({
        key: PageKey.MEMORANDUM,
        title: { en: 'Memorandum', fa: 'مرام نامه' },
        body: {
          en: '<p>Content</p>',
          fa: '<p>متن</p>',
        },
        image: undefined,
      });
      expect(result).toEqual(mockPage);
    });

    it('updates existing page on save and sanitizes body', async () => {
      const existing = buildPageDoc({
        image: { key: 'existing.jpg' },
      });
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.save(PageKey.ABOUT_FORUM, {
        title: { en: 'New Title', fa: 'عنوان جدید' },
        body: {
          en: '<p>Safe</p><script>evil()</script>',
          fa: '<p>امن</p>',
        },
      });

      expect(existing.title).toEqual({ en: 'New Title', fa: 'عنوان جدید' });
      expect(existing.body.en).toBe('<p>Safe</p>');
      expect(existing.body.en).not.toContain('<script>');
      expect(existing.body.fa).toBe('<p>امن</p>');
      // Preserves existing image on text-only edit
      expect(existing.image).toEqual({ key: 'existing.jpg' });
      expect(existing.save).toHaveBeenCalled();
    });

    it('replaces image when new image is provided', async () => {
      const existing = buildPageDoc({
        image: { key: 'old.jpg' },
      });
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      const newImage = { key: 'new.jpg', mimeType: 'image/jpeg' };
      await service.save(PageKey.ABOUT_FORUM, {
        image: newImage,
      });

      expect(existing.image).toEqual(newImage);
      expect(existing.save).toHaveBeenCalled();
    });

    it('clears image when removeImage is true', async () => {
      const existing = buildPageDoc({
        image: { key: 'old.jpg' },
      });
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.save(PageKey.ABOUT_FORUM, {
        removeImage: true,
      });

      expect(existing.image).toBeUndefined();
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid page key', async () => {
      await expect(
        service.save('invalid-key', { title: { en: 'test' } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('creates a new page and sanitizes rich-text HTML', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      pageModel.create.mockResolvedValue(mockPage);

      const result = await service.create({
        key: PageKey.GOALS,
        title: { en: 'Goals', fa: 'اهداف' },
        body: {
          en: '<p>Goals</p><script>bad()</script>',
          fa: '<p>اهداف</p>',
        },
        image: { key: 'goals.jpg' },
      });

      expect(pageModel.create).toHaveBeenCalledWith({
        key: PageKey.GOALS,
        title: { en: 'Goals', fa: 'اهداف' },
        body: {
          en: '<p>Goals</p>',
          fa: '<p>اهداف</p>',
        },
        image: { key: 'goals.jpg' },
      });
      expect(result).toEqual(mockPage);
    });

    it('throws ConflictException if page key already exists', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPage),
      });

      await expect(
        service.create({
          key: PageKey.ABOUT_FORUM,
          title: { en: 'About' },
          body: { en: '<p>About</p>' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for invalid page key', async () => {
      await expect(
        service.create({
          key: 'unknown-key' as PageKey,
          title: { en: 'About' },
          body: { en: '<p>About</p>' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates existing page fields and sanitizes body', async () => {
      const existing = buildPageDoc();
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.update(PageKey.ABOUT_FORUM, {
        title: { en: 'Updated', fa: 'به‌روز شده' },
        body: { en: '<p>Updated</p><script>alert(1)</script>' },
      });

      expect(existing.title).toEqual({ en: 'Updated', fa: 'به‌روز شده' });
      expect(existing.body.en).toBe('<p>Updated</p>');
      expect(existing.body.en).not.toContain('<script>');
      expect(existing.save).toHaveBeenCalled();
    });

    it('removes image when removeImage is true in update', async () => {
      const existing = buildPageDoc({ image: { key: 'img.png' } });
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });

      await service.update(PageKey.ABOUT_FORUM, {
        removeImage: true,
      });

      expect(existing.image).toBeUndefined();
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when page to update is not found', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(PageKey.ABOUT_FORUM, { title: { en: 'New' } }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('seed', () => {
    it('idempotently seeds the 6 canonical default pages', async () => {
      pageModel.updateOne
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockResolvedValueOnce({ upsertedCount: 1 })
        .mockResolvedValueOnce({ upsertedCount: 1 });
      pageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(6),
      });

      const result = await service.seed();

      expect(pageModel.updateOne).toHaveBeenCalledTimes(DEFAULT_PAGES.length);
      expect(result).toEqual({ seeded: 6, total: 6 });
    });
  });

  describe('delete', () => {
    it('deletes page by key', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPage),
      });
      pageModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPage),
      });

      const result = await service.delete(PageKey.ABOUT_FORUM);

      expect(pageModel.findByIdAndDelete).toHaveBeenCalledWith(mockPage._id);
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException when page to delete is not found', async () => {
      pageModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

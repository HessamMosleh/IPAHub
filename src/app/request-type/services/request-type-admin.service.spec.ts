import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RequestTypeAdminService } from './request-type-admin.service';
import {
  MEMBERSHIP_CARD_SLUG,
  RequestType,
  RequestTypeProp,
} from '../request-type.schema';
import { DocumentRequest } from '../../document-request/document-request.schema';
import { Province } from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { ReorderDirection } from '../dtos/reorder-request-type.dto';
import { DEFAULT_REQUEST_TYPES } from '../constants/default-request-types';
import {
  buildDocumentRequestModelMock,
  buildProvinceModelMock,
  buildQueryChain,
  buildRequestTypeDoc,
  buildRequestTypeModelMock,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_TYPE_ID,
} from './__test-helpers__/request-type-test-fixtures';

describe('RequestTypeAdminService', () => {
  let service: RequestTypeAdminService;
  let requestTypeModel: ReturnType<typeof buildRequestTypeModelMock>;
  let documentRequestModel: ReturnType<typeof buildDocumentRequestModelMock>;
  let provinceModel: ReturnType<typeof buildProvinceModelMock>;

  beforeEach(async () => {
    requestTypeModel = buildRequestTypeModelMock();
    documentRequestModel = buildDocumentRequestModelMock();
    provinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestTypeAdminService,
        {
          provide: getModelToken(RequestType.name),
          useValue: requestTypeModel,
        },
        {
          provide: getModelToken(DocumentRequest.name),
          useValue: documentRequestModel,
        },
        {
          provide: getModelToken(Province.name),
          useValue: provinceModel,
        },
      ],
    }).compile();

    service = module.get<RequestTypeAdminService>(RequestTypeAdminService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated request types with admin props and populated provinces', async () => {
      const doc = buildRequestTypeDoc();
      const chain = buildQueryChain([doc]);
      requestTypeModel.find.mockReturnValue(chain);
      requestTypeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(requestTypeModel.find).toHaveBeenCalledWith({});
      expect(chain.select).toHaveBeenCalledWith(RequestTypeProp.admin);
      expect(chain.populate).toHaveBeenCalledWith(
        'prices.province',
        'slug name',
      );
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [doc],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('filters by status and producesDocument flag', async () => {
      const chain = buildQueryChain([]);
      requestTypeModel.find.mockReturnValue(chain);
      requestTypeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        status: ActiveStatus.ACTIVE,
        producesDocument: true,
        search: 'letter',
      });

      expect(requestTypeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ActiveStatus.ACTIVE,
          producesDocument: true,
          $or: [
            { slug: /letter/i },
            { 'name.en': /letter/i },
            { 'name.fa': /letter/i },
          ],
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns request type with admin props', async () => {
      const doc = buildRequestTypeDoc();
      const chain = buildQueryChain(doc);
      requestTypeModel.findById.mockReturnValue(chain);

      const result = await service.findById(FIXED_REQUEST_TYPE_ID);

      expect(requestTypeModel.findById).toHaveBeenCalledWith(
        FIXED_REQUEST_TYPE_ID,
      );
      expect(result).toEqual(doc);
    });

    it('throws NotFoundException when request type does not exist', async () => {
      const chain = buildQueryChain(null);
      requestTypeModel.findById.mockReturnValue(chain);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('returns request type by slug with admin props', async () => {
      const doc = buildRequestTypeDoc();
      const chain = buildQueryChain(doc);
      requestTypeModel.findOne.mockReturnValue(chain);

      const result = await service.findBySlug('membership-certificate');

      expect(requestTypeModel.findOne).toHaveBeenCalledWith({
        slug: 'membership-certificate',
      });
      expect(result).toEqual(doc);
    });

    it('throws NotFoundException when slug does not exist', async () => {
      const chain = buildQueryChain(null);
      requestTypeModel.findOne.mockReturnValue(chain);

      await expect(service.findBySlug('missing-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a request type with an auto-generated unique slug from English name', async () => {
      requestTypeModel.findOne
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(buildQueryChain({ order: 0 }));
      requestTypeModel.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve(buildRequestTypeDoc(data)),
      );

      const result = await service.create({
        name: { en: 'Good Standing Letter', fa: 'گواهی حسن انجام کار' },
        baseFee: 150_000,
        producesDocument: true,
      });

      expect(requestTypeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'good-standing-letter',
          name: { en: 'Good Standing Letter', fa: 'گواهی حسن انجام کار' },
          baseFee: 150_000,
          producesDocument: true,
          status: ActiveStatus.ACTIVE,
        }),
      );
      expect(result.slug).toBe('good-standing-letter');
    });

    it('throws BadRequestException if English name is missing or empty', async () => {
      await expect(
        service.create({
          name: { en: '   ', fa: 'فقط فارسی' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('de-duplicates auto-generated slug on collision', async () => {
      requestTypeModel.findOne
        .mockResolvedValueOnce(buildRequestTypeDoc({ slug: 'card' }))
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(buildQueryChain({ order: 0 }));

      requestTypeModel.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve(buildRequestTypeDoc(data)),
      );

      const result = await service.create({
        name: { en: 'Card' },
      });

      expect(result.slug).toBe('card-2');
    });

    it('accepts explicit slug and rejects if duplicate', async () => {
      requestTypeModel.findOne.mockResolvedValue(
        buildRequestTypeDoc({ slug: 'custom-slug' }),
      );

      await expect(
        service.create({
          slug: 'custom-slug',
          name: { en: 'Custom' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('determines order sequentially at end of list if order is omitted', async () => {
      requestTypeModel.findOne.mockImplementation(
        (filter: { slug?: string } | undefined) => {
          if (filter?.slug) return Promise.resolve(null);
          return {
            sort: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ order: 7 }),
              }),
            }),
          };
        },
      );

      requestTypeModel.create.mockImplementation(
        (data: Record<string, unknown>) =>
          Promise.resolve(buildRequestTypeDoc(data)),
      );

      const result = await service.create({
        name: { en: 'Next Item' },
      });

      expect(result.order).toBe(8);
    });
  });

  describe('update', () => {
    it('updates name, description, baseFee, producesDocument, order, and status', async () => {
      const doc = buildRequestTypeDoc();
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValue(doc as unknown as RequestType);

      await service.update(FIXED_REQUEST_TYPE_ID, {
        name: { en: 'Updated Certificate', fa: 'گواهی به‌روزشده' },
        description: { en: 'New description' },
        baseFee: 500_000,
        producesDocument: false,
        order: 2,
        status: ActiveStatus.DISABLED,
      });

      expect(doc.name).toEqual({
        en: 'Updated Certificate',
        fa: 'گواهی به‌روزشده',
      });
      expect(doc.description).toEqual({ en: 'New description' });
      expect(doc.baseFee).toBe(500_000);
      expect(doc.producesDocument).toBe(false);
      expect(doc.order).toBe(2);
      expect(doc.status).toBe(ActiveStatus.DISABLED);
      expect(doc.save).toHaveBeenCalled();
      expect(findByIdSpy).toHaveBeenCalledWith(FIXED_REQUEST_TYPE_ID);
    });

    it('prevents modifying the slug of membership-card', async () => {
      const doc = buildRequestTypeDoc({ slug: MEMBERSHIP_CARD_SLUG });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.update(FIXED_REQUEST_TYPE_ID, { slug: 'new-card-slug' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update if new slug conflicts with another type', async () => {
      const doc = buildRequestTypeDoc({ slug: 'old-slug' });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      requestTypeModel.findOne.mockResolvedValue(
        buildRequestTypeDoc({ slug: 'taken-slug' }),
      );

      await expect(
        service.update(FIXED_REQUEST_TYPE_ID, { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when updating non-existent request type', async () => {
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('missing-id', { name: { en: 'Test' } }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setProvincePrices', () => {
    it('sets valid overrides and strips null/undefined fees', async () => {
      const doc = buildRequestTypeDoc({ prices: [] });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: FIXED_PROVINCE_ID }),
      });
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(doc as unknown as RequestType);

      await service.setProvincePrices(FIXED_REQUEST_TYPE_ID, {
        prices: [
          { province: FIXED_PROVINCE_ID, fee: 750_000 },
          { province: '66fa3b5a9c1e7a001f3e9a33', fee: null },
        ],
      });

      expect(doc.prices).toHaveLength(1);
      expect(doc.prices[0].fee).toBe(750_000);
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException if referenced province does not exist', async () => {
      const doc = buildRequestTypeDoc();
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.setProvincePrices(FIXED_REQUEST_TYPE_ID, {
          prices: [{ province: 'invalid-province-id', fee: 100_000 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if request type does not exist', async () => {
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.setProvincePrices('missing-id', { prices: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('swaps order with adjacent request type in UP direction', async () => {
      const r0 = buildRequestTypeDoc({ _id: 'id-0', order: 0 });
      const r1 = buildRequestTypeDoc({ _id: 'id-1', order: 1 });
      requestTypeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([r0, r1]),
        }),
      });

      await service.reorder('id-1', { dir: ReorderDirection.UP });

      expect(requestTypeModel.findByIdAndUpdate).toHaveBeenCalledWith('id-1', {
        order: 0,
      });
      expect(requestTypeModel.findByIdAndUpdate).toHaveBeenCalledWith('id-0', {
        order: 1,
      });
    });

    it('throws BadRequestException when attempting to reorder UP on first element', async () => {
      const r0 = buildRequestTypeDoc({ _id: 'id-0', order: 0 });
      requestTypeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([r0]),
        }),
      });

      await expect(
        service.reorder('id-0', { dir: ReorderDirection.UP }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when attempting to reorder DOWN on last element', async () => {
      const r0 = buildRequestTypeDoc({ _id: 'id-0', order: 0 });
      requestTypeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([r0]),
        }),
      });

      await expect(
        service.reorder('id-0', { dir: ReorderDirection.DOWN }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('permanently deletes an unreferenced request type', async () => {
      const doc = buildRequestTypeDoc({ slug: 'custom-letter' });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      documentRequestModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      requestTypeModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.delete(FIXED_REQUEST_TYPE_ID);

      expect(requestTypeModel.findByIdAndDelete).toHaveBeenCalledWith(
        FIXED_REQUEST_TYPE_ID,
      );
      expect(result).toEqual({ success: true, softDeleted: false });
    });

    it('soft-deletes (disables) when existing document requests reference it', async () => {
      const doc = buildRequestTypeDoc({ slug: 'custom-letter' });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      documentRequestModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      });

      const result = await service.delete(FIXED_REQUEST_TYPE_ID);

      expect(doc.status).toBe(ActiveStatus.DISABLED);
      expect(doc.save).toHaveBeenCalled();
      expect(requestTypeModel.findByIdAndDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, softDeleted: true });
    });

    it('throws BadRequestException when attempting to delete membership-card', async () => {
      const doc = buildRequestTypeDoc({ slug: MEMBERSHIP_CARD_SLUG });
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(service.delete(FIXED_REQUEST_TYPE_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if request type does not exist', async () => {
      requestTypeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.delete('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('seed', () => {
    it('idempotently upserts the 5 canonical request types with $setOnInsert', async () => {
      requestTypeModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      requestTypeModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.seed();

      expect(requestTypeModel.updateOne).toHaveBeenCalledTimes(
        DEFAULT_REQUEST_TYPES.length,
      );
      const firstCall = requestTypeModel.updateOne.mock.calls[0] as unknown as [
        { slug: string },
        {
          $setOnInsert: {
            slug: string;
            baseFee: number;
            producesDocument: boolean;
          };
        },
        { upsert: boolean },
      ];
      expect(firstCall[0]).toEqual({ slug: 'membership-card' });
      expect(firstCall[1].$setOnInsert.slug).toBe('membership-card');
      expect(firstCall[1].$setOnInsert.baseFee).toBe(500_000);
      expect(firstCall[1].$setOnInsert.producesDocument).toBe(true);
      expect(firstCall[2]).toEqual({ upsert: true });
      expect(result).toEqual({ seeded: 5, total: 5 });
    });
  });
});

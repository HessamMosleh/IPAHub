import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { RequestTypeService } from './request-type.service';
import { RequestType, RequestTypeProp } from '../request-type.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildQueryChain,
  buildRequestTypeDoc,
  buildRequestTypeModelMock,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_TYPE_ID,
} from './__test-helpers__/request-type-test-fixtures';

describe('RequestTypeService', () => {
  let service: RequestTypeService;
  let requestTypeModel: ReturnType<typeof buildRequestTypeModelMock>;

  const mockRequestType = buildRequestTypeDoc({
    prices: [
      {
        province: FIXED_PROVINCE_ID,
        fee: 450_000,
      },
    ],
  });

  beforeEach(async () => {
    requestTypeModel = buildRequestTypeModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestTypeService,
        {
          provide: getModelToken(RequestType.name),
          useValue: requestTypeModel,
        },
      ],
    }).compile();

    service = module.get<RequestTypeService>(RequestTypeService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllActive', () => {
    it('returns all active request types with client props and populated province', async () => {
      const chain = buildQueryChain([mockRequestType]);
      requestTypeModel.find.mockReturnValue(chain);

      const result = await service.findAllActive();

      expect(requestTypeModel.find).toHaveBeenCalledWith({
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(RequestTypeProp.client);
      expect(chain.populate).toHaveBeenCalledWith(
        'prices.province',
        'slug name',
      );
      expect(result).toEqual([mockRequestType]);
    });

    it('filters active request types by search keyword across slug and bilingual name', async () => {
      const chain = buildQueryChain([mockRequestType]);
      requestTypeModel.find.mockReturnValue(chain);

      const result = await service.findAllActive({ search: 'cert' });

      expect(requestTypeModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ActiveStatus.ACTIVE,
          $or: [
            { slug: /cert/i },
            { 'name.en': /cert/i },
            { 'name.fa': /cert/i },
          ],
        }),
      );
      expect(result).toEqual([mockRequestType]);
    });
  });

  describe('findBySlug', () => {
    it('finds active request type by slug and selects client props', async () => {
      const chain = buildQueryChain(mockRequestType);
      requestTypeModel.findOne.mockReturnValue(chain);

      const result = await service.findBySlug('membership-certificate');

      expect(requestTypeModel.findOne).toHaveBeenCalledWith({
        slug: 'membership-certificate',
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(RequestTypeProp.client);
      expect(chain.populate).toHaveBeenCalledWith(
        'prices.province',
        'slug name',
      );
      expect(result).toEqual(mockRequestType);
    });

    it('throws NotFoundException when request type does not exist or is inactive', async () => {
      const chain = buildQueryChain(null);
      requestTypeModel.findOne.mockReturnValue(chain);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('finds active request type by id and selects client props', async () => {
      const chain = buildQueryChain(mockRequestType);
      requestTypeModel.findOne.mockReturnValue(chain);

      const result = await service.findById(FIXED_REQUEST_TYPE_ID);

      expect(requestTypeModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_REQUEST_TYPE_ID,
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(RequestTypeProp.client);
      expect(chain.populate).toHaveBeenCalledWith(
        'prices.province',
        'slug name',
      );
      expect(result).toEqual(mockRequestType);
    });

    it('throws NotFoundException when request type does not exist by id', async () => {
      const chain = buildQueryChain(null);
      requestTypeModel.findOne.mockReturnValue(chain);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolvePrice', () => {
    it('returns province fee override when member province matches an entry in prices', () => {
      const fee = service.resolvePrice(
        mockRequestType as unknown as RequestType,
        FIXED_PROVINCE_ID,
      );
      expect(fee).toBe(450_000);
    });

    it('falls back to national base fee when member province does not match any override', () => {
      const fee = service.resolvePrice(
        mockRequestType as unknown as RequestType,
        'other-province-id',
      );
      expect(fee).toBe(300_000);
    });

    it('falls back to base fee when no province is provided', () => {
      const fee = service.resolvePrice(
        mockRequestType as unknown as RequestType,
        undefined,
      );
      expect(fee).toBe(300_000);
    });
  });
});

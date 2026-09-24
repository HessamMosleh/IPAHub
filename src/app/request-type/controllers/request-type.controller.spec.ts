import { Test, TestingModule } from '@nestjs/testing';
import { RequestTypeController } from './request-type.controller';
import { RequestTypeService } from '../services/request-type.service';
import {
  buildRequestTypeDoc,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_TYPE_ID,
} from '../services/__test-helpers__/request-type-test-fixtures';

describe('RequestTypeController', () => {
  let controller: RequestTypeController;
  let mockService: {
    findAllActive: jest.Mock;
    findBySlug: jest.Mock;
    findById: jest.Mock;
    resolvePrice: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findAllActive: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      resolvePrice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestTypeController],
      providers: [
        {
          provide: RequestTypeService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RequestTypeController>(RequestTypeController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('passes query to RequestTypeService.findAllActive and formats response', async () => {
      const doc = buildRequestTypeDoc();
      mockService.findAllActive.mockResolvedValue([doc]);

      const query = { search: 'certificate' };
      const result = await controller.findAll(query);

      expect(mockService.findAllActive).toHaveBeenCalledWith(query);
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(FIXED_REQUEST_TYPE_ID);
      expect(result[0].slug).toBe('membership-certificate');
      expect(result[0].applicableFee).toBeUndefined();
    });

    it('attaches applicableFee when province query is provided', async () => {
      const doc = buildRequestTypeDoc();
      mockService.findAllActive.mockResolvedValue([doc]);
      mockService.resolvePrice.mockReturnValue(450_000);

      const query = { province: FIXED_PROVINCE_ID };
      const result = await controller.findAll(query);

      expect(mockService.findAllActive).toHaveBeenCalledWith(query);
      expect(mockService.resolvePrice).toHaveBeenCalledWith(
        expect.anything(),
        FIXED_PROVINCE_ID,
      );
      expect(result[0].applicableFee).toBe(450_000);
    });
  });

  describe('findBySlug', () => {
    it('forwards slug and optional province to RequestTypeService.findBySlug', async () => {
      const doc = buildRequestTypeDoc();
      mockService.findBySlug.mockResolvedValue(doc);
      mockService.resolvePrice.mockReturnValue(500_000);

      const result = await controller.findBySlug(
        'membership-certificate',
        FIXED_PROVINCE_ID,
      );

      expect(mockService.findBySlug).toHaveBeenCalledWith(
        'membership-certificate',
      );
      expect(mockService.resolvePrice).toHaveBeenCalledWith(
        expect.anything(),
        FIXED_PROVINCE_ID,
      );
      expect(result._id).toBe(FIXED_REQUEST_TYPE_ID);
      expect(result.applicableFee).toBe(500_000);
    });
  });

  describe('findById', () => {
    it('forwards id and optional province to RequestTypeService.findById', async () => {
      const doc = buildRequestTypeDoc();
      mockService.findById.mockResolvedValue(doc);

      const result = await controller.findById(FIXED_REQUEST_TYPE_ID);

      expect(mockService.findById).toHaveBeenCalledWith(FIXED_REQUEST_TYPE_ID);
      expect(result._id).toBe(FIXED_REQUEST_TYPE_ID);
    });
  });
});

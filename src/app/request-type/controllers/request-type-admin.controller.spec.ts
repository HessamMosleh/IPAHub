import { Test, TestingModule } from '@nestjs/testing';
import { RequestTypeAdminController } from './request-type-admin.controller';
import { RequestTypeAdminService } from '../services/request-type-admin.service';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { ReorderDirection } from '../dtos/reorder-request-type.dto';
import {
  buildRequestTypeDoc,
  FIXED_PROVINCE_ID,
  FIXED_REQUEST_TYPE_ID,
} from '../services/__test-helpers__/request-type-test-fixtures';

describe('RequestTypeAdminController', () => {
  let controller: RequestTypeAdminController;
  let mockService: {
    findAll: jest.Mock;
    seed: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    setProvincePrices: jest.Mock;
    reorder: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      seed: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setProvincePrices: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestTypeAdminController],
      providers: [
        {
          provide: RequestTypeAdminService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RequestTypeAdminController>(
      RequestTypeAdminController,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('passes query to RequestTypeAdminService.findAll', async () => {
      const paginated = {
        data: [buildRequestTypeDoc()],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
      mockService.findAll.mockResolvedValue(paginated);

      const query = { page: 1, limit: 50, status: ActiveStatus.ACTIVE };
      const result = await controller.findAll(query);

      expect(mockService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
    });
  });

  describe('seed', () => {
    it('calls RequestTypeAdminService.seed', async () => {
      mockService.seed.mockResolvedValue({ seeded: 5, total: 5 });

      const result = await controller.seed();

      expect(mockService.seed).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ seeded: 5, total: 5 });
    });
  });

  describe('findById', () => {
    it('forwards id to RequestTypeAdminService.findById', async () => {
      const doc = buildRequestTypeDoc();
      mockService.findById.mockResolvedValue(doc);

      const result = await controller.findById(FIXED_REQUEST_TYPE_ID);

      expect(mockService.findById).toHaveBeenCalledWith(FIXED_REQUEST_TYPE_ID);
      expect(result).toEqual(doc);
    });
  });

  describe('create', () => {
    it('forwards DTO to RequestTypeAdminService.create', async () => {
      const doc = buildRequestTypeDoc();
      mockService.create.mockResolvedValue(doc);

      const dto = {
        name: { en: 'Card' },
        baseFee: 500_000,
      };
      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(doc);
    });
  });

  describe('update', () => {
    it('forwards id and update DTO to RequestTypeAdminService.update', async () => {
      const doc = buildRequestTypeDoc();
      mockService.update.mockResolvedValue(doc);

      const dto = { baseFee: 600_000 };
      const result = await controller.update(FIXED_REQUEST_TYPE_ID, dto);

      expect(mockService.update).toHaveBeenCalledWith(
        FIXED_REQUEST_TYPE_ID,
        dto,
      );
      expect(result).toEqual(doc);
    });
  });

  describe('setProvincePrices', () => {
    it('forwards id and pricing DTO to RequestTypeAdminService.setProvincePrices', async () => {
      const doc = buildRequestTypeDoc();
      mockService.setProvincePrices.mockResolvedValue(doc);

      const dto = {
        prices: [{ province: FIXED_PROVINCE_ID, fee: 700_000 }],
      };
      const result = await controller.setProvincePrices(
        FIXED_REQUEST_TYPE_ID,
        dto,
      );

      expect(mockService.setProvincePrices).toHaveBeenCalledWith(
        FIXED_REQUEST_TYPE_ID,
        dto,
      );
      expect(result).toEqual(doc);
    });
  });

  describe('reorder', () => {
    it('forwards id and reorder DTO to RequestTypeAdminService.reorder', async () => {
      const docs = [buildRequestTypeDoc()];
      mockService.reorder.mockResolvedValue(docs);

      const dto = { dir: ReorderDirection.UP };
      const result = await controller.reorder(FIXED_REQUEST_TYPE_ID, dto);

      expect(mockService.reorder).toHaveBeenCalledWith(
        FIXED_REQUEST_TYPE_ID,
        dto,
      );
      expect(result).toEqual(docs);
    });
  });

  describe('delete', () => {
    it('forwards id to RequestTypeAdminService.delete', async () => {
      mockService.delete.mockResolvedValue({
        success: true,
        softDeleted: false,
      });

      const result = await controller.delete(FIXED_REQUEST_TYPE_ID);

      expect(mockService.delete).toHaveBeenCalledWith(FIXED_REQUEST_TYPE_ID);
      expect(result).toEqual({ success: true, softDeleted: false });
    });
  });
});

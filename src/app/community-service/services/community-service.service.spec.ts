import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CommunityServiceService } from './community-service.service';
import { CommunityService } from '../community-service.schema';
import {
  buildCommunityServiceModelMock,
  buildCommunityService,
  buildQueryChain,
  FIXED_SERVICE_ID,
} from './__test-helpers__/community-service-test-fixtures';

describe('CommunityServiceService', () => {
  let service: CommunityServiceService;
  let mockModel: ReturnType<typeof buildCommunityServiceModelMock>;

  beforeEach(async () => {
    mockModel = buildCommunityServiceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityServiceService,
        {
          provide: getModelToken(CommunityService.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<CommunityServiceService>(CommunityServiceService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all services sorted by order ascending', async () => {
      const s1 = buildCommunityService({ order: 0 });
      const s2 = buildCommunityService({
        _id: '507f1f77bcf86cd799439022',
        order: 1,
      });

      mockModel.find.mockReturnValue(buildQueryChain([s1, s2]));

      const result = await service.findAll();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual([s1, s2]);
    });

    it('applies search filter across title and description regex', async () => {
      mockModel.find.mockReturnValue(buildQueryChain([]));

      await service.findAll({ search: 'training.*' });

      // Independence: only one call to find() per test — no shared state.
      expect(mockModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        mockModel.find.mock.calls[0] as unknown as [Record<string, any>]
      )[0];
      // The literal characters that would otherwise form a regex are escaped.
      expect(filter.$or).toBeDefined();
      const orClause = filter.$or as Array<Record<string, RegExp>>;
      expect(orClause[0]['title.en'].source).toContain('training\\.\\*');
      expect(orClause[1]['title.fa'].source).toContain('training\\.\\*');
      expect(orClause[2]['description.en'].source).toContain('training\\.\\*');
      expect(orClause[3]['description.fa'].source).toContain('training\\.\\*');
    });
  });

  describe('findById', () => {
    it('returns a community service by valid MongoDB ObjectId', async () => {
      const item = buildCommunityService();
      mockModel.findById.mockReturnValue(buildQueryChain(item));

      const result = await service.findById(FIXED_SERVICE_ID);

      expect(mockModel.findById).toHaveBeenCalledWith(FIXED_SERVICE_ID);
      expect(result).toEqual(item);
    });

    it('throws NotFoundException for invalid ObjectId format', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when service does not exist', async () => {
      mockModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findById(FIXED_SERVICE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

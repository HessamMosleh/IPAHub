import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProvinceService } from './province.service';
import {
  Province,
  ProvinceProp,
} from '../../../common/schemas/province.schema';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import {
  buildProvinceDoc,
  buildProvinceModelMock,
  buildQueryChain,
} from './__test-helpers__/province-test-fixtures';

describe('ProvinceService', () => {
  let service: ProvinceService;
  let provinceModel: ReturnType<typeof buildProvinceModelMock>;

  const mockProvince = buildProvinceDoc({
    socials: { telegram: 'https://t.me/ipa_isfahan' },
    contactAddress: {
      en: '12 Hafez St, Isfahan',
      fa: 'اصفهان، خیابان حافظ ۱۲',
    },
    contactPhone: '03133445566',
    contactEmail: 'isfahan@ipa.ir',
    status: ActiveStatus.ACTIVE,
  });

  beforeEach(async () => {
    provinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvinceService,
        {
          provide: getModelToken(Province.name),
          useValue: provinceModel,
        },
      ],
    }).compile();

    service = module.get<ProvinceService>(ProvinceService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllActive', () => {
    it('returns all active provinces with general props including contact details', async () => {
      const chain = buildQueryChain([mockProvince]);
      provinceModel.find.mockReturnValue(chain);

      const result = await service.findAllActive();

      expect(provinceModel.find).toHaveBeenCalledWith({
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(ProvinceProp.general);
      expect(result).toEqual([mockProvince]);
    });
  });

  describe('findBySlug', () => {
    it('finds active province by slug and selects general props', async () => {
      const chain = buildQueryChain(mockProvince);
      provinceModel.findOne.mockReturnValue(chain);

      const result = await service.findBySlug('isfahan');

      expect(provinceModel.findOne).toHaveBeenCalledWith({
        slug: 'isfahan',
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(ProvinceProp.general);
      expect(result).toEqual(mockProvince);
    });

    it('throws NotFoundException when province does not exist or is inactive', async () => {
      const chain = buildQueryChain(null);
      provinceModel.findOne.mockReturnValue(chain);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('finds active province by id and selects general props', async () => {
      const chain = buildQueryChain(mockProvince);
      provinceModel.findOne.mockReturnValue(chain);

      const result = await service.findById('66fa3b5a9c1e7a001f3e9a11');

      expect(provinceModel.findOne).toHaveBeenCalledWith({
        _id: '66fa3b5a9c1e7a001f3e9a11',
        status: ActiveStatus.ACTIVE,
      });
      expect(chain.select).toHaveBeenCalledWith(ProvinceProp.general);
      expect(result).toEqual(mockProvince);
    });

    it('throws NotFoundException when province does not exist by id', async () => {
      const chain = buildQueryChain(null);
      provinceModel.findOne.mockReturnValue(chain);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

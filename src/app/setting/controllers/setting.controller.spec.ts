import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { SettingService } from '../services/setting.service';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';

describe('SettingController', () => {
  let controller: SettingController;
  let mockSettingService: {
    getSiteSettings: jest.Mock;
    getSiteSetting: jest.Mock;
  };

  const mockSettingsResponse: SiteSettingsResponseDto = {
    associationName: 'Iranian Petroleum Consultants Association',
    facebook: 'https://facebook.com/ipa',
    instagram: 'https://instagram.com/ipa',
    telegram: 'https://t.me/ipa',
    whatsapp: 'https://wa.me/982188880000',
    socials: {
      facebook: 'https://facebook.com/ipa',
      instagram: 'https://instagram.com/ipa',
      telegram: 'https://t.me/ipa',
      whatsapp: 'https://wa.me/982188880000',
    },
  };

  beforeEach(async () => {
    mockSettingService = {
      getSiteSettings: jest.fn(),
      getSiteSetting: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingController],
      providers: [
        {
          provide: SettingService,
          useValue: mockSettingService,
        },
      ],
    }).compile();

    controller = module.get<SettingController>(SettingController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSiteSettings', () => {
    it('returns public site settings from service', async () => {
      mockSettingService.getSiteSettings.mockResolvedValue(
        mockSettingsResponse,
      );

      const result = await controller.getSiteSettings();

      expect(mockSettingService.getSiteSettings).toHaveBeenCalled();
      expect(result).toEqual(mockSettingsResponse);
    });
  });

  describe('getSiteSetting', () => {
    it('returns single setting key-value pair from service', async () => {
      mockSettingService.getSiteSetting.mockResolvedValue('IPA');

      const result = await controller.getSiteSetting('associationName');

      expect(mockSettingService.getSiteSetting).toHaveBeenCalledWith(
        'associationName',
      );
      expect(result).toEqual({ key: 'associationName', value: 'IPA' });
    });

    it('propagates NotFoundException when service throws for unknown key', async () => {
      mockSettingService.getSiteSetting.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.getSiteSetting('unknown_key')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

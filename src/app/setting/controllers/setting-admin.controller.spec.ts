import { Test, TestingModule } from '@nestjs/testing';
import { SettingAdminController } from './setting-admin.controller';
import { SettingAdminService } from '../services/setting-admin.service';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';

describe('SettingAdminController', () => {
  let controller: SettingAdminController;
  let mockSettingAdminService: {
    getSiteSettings: jest.Mock;
    getSiteSetting: jest.Mock;
    saveSiteSettings: jest.Mock;
    setSiteSetting: jest.Mock;
    getMemberSettings: jest.Mock;
    getMemberSetting: jest.Mock;
    setMemberSetting: jest.Mock;
    seed: jest.Mock;
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
    mockSettingAdminService = {
      getSiteSettings: jest.fn(),
      getSiteSetting: jest.fn(),
      saveSiteSettings: jest.fn(),
      setSiteSetting: jest.fn(),
      getMemberSettings: jest.fn(),
      getMemberSetting: jest.fn(),
      setMemberSetting: jest.fn(),
      seed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingAdminController],
      providers: [
        {
          provide: SettingAdminService,
          useValue: mockSettingAdminService,
        },
      ],
    }).compile();

    controller = module.get<SettingAdminController>(SettingAdminController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllSiteSettings', () => {
    it('returns site settings from service', async () => {
      mockSettingAdminService.getSiteSettings.mockResolvedValue(
        mockSettingsResponse,
      );

      const result = await controller.findAllSiteSettings();

      expect(mockSettingAdminService.getSiteSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSettingsResponse);
    });
  });

  describe('getSiteSettings', () => {
    it('returns site settings from service', async () => {
      mockSettingAdminService.getSiteSettings.mockResolvedValue(
        mockSettingsResponse,
      );

      const result = await controller.getSiteSettings();

      expect(mockSettingAdminService.getSiteSettings).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSettingsResponse);
    });
  });

  describe('saveSiteSettings', () => {
    it('forwards update payload to service and returns updated settings', async () => {
      const dto = { associationName: 'New Name' };
      mockSettingAdminService.saveSiteSettings.mockResolvedValue({
        ...mockSettingsResponse,
        associationName: 'New Name',
      });

      const result = await controller.saveSiteSettings(dto);

      expect(mockSettingAdminService.saveSiteSettings).toHaveBeenCalledWith(
        dto,
      );
      expect(result.associationName).toBe('New Name');
    });
  });

  describe('getSiteSetting & setSiteSetting', () => {
    it('gets a single site setting', async () => {
      mockSettingAdminService.getSiteSetting.mockResolvedValue('My Logo Key');

      const result = await controller.getSiteSetting('logoKey');

      expect(mockSettingAdminService.getSiteSetting).toHaveBeenCalledWith(
        'logoKey',
      );
      expect(result).toEqual({ key: 'logoKey', value: 'My Logo Key' });
    });

    it('sets a single site setting', async () => {
      mockSettingAdminService.setSiteSetting.mockResolvedValue({
        key: 'associationName',
        value: 'New Association',
      });

      const result = await controller.setSiteSetting('associationName', {
        value: 'New Association',
      });

      expect(mockSettingAdminService.setSiteSetting).toHaveBeenCalledWith(
        'associationName',
        'New Association',
      );
      expect(result).toEqual({
        key: 'associationName',
        value: 'New Association',
      });
    });
  });

  describe('member settings endpoints', () => {
    it('gets all member settings', async () => {
      mockSettingAdminService.getMemberSettings.mockResolvedValue({
        membershipNoSeq: '1000',
      });

      const result = await controller.getMemberSettings();

      expect(mockSettingAdminService.getMemberSettings).toHaveBeenCalled();
      expect(result).toEqual({ settings: { membershipNoSeq: '1000' } });
    });

    it('gets a single member setting', async () => {
      mockSettingAdminService.getMemberSetting.mockResolvedValue('1000');

      const result = await controller.getMemberSetting('membershipNoSeq');

      expect(mockSettingAdminService.getMemberSetting).toHaveBeenCalledWith(
        'membershipNoSeq',
      );
      expect(result).toEqual({ key: 'membershipNoSeq', value: '1000' });
    });

    it('sets a single member setting', async () => {
      mockSettingAdminService.setMemberSetting.mockResolvedValue({
        key: 'membershipNoSeq',
        value: '2000',
      });

      const result = await controller.setMemberSetting('membershipNoSeq', {
        value: '2000',
      });

      expect(mockSettingAdminService.setMemberSetting).toHaveBeenCalledWith(
        'membershipNoSeq',
        '2000',
      );
      expect(result).toEqual({ key: 'membershipNoSeq', value: '2000' });
    });
  });

  describe('seed', () => {
    it('invokes seed on service and returns result', async () => {
      mockSettingAdminService.seed.mockResolvedValue({
        seededSite: 6,
        seededMember: 1,
        total: 7,
      });

      const result = await controller.seed();

      expect(mockSettingAdminService.seed).toHaveBeenCalled();
      expect(result).toEqual({
        seededSite: 6,
        seededMember: 1,
        total: 7,
      });
    });
  });
});

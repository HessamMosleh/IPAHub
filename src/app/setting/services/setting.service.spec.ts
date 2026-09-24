import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { SettingService } from './setting.service';
import { SiteSetting, SiteSettingKey } from '../site-setting.schema';
import { DEFAULT_SITE_SETTINGS } from '../constants/default-settings';
import {
  buildQueryChain,
  buildSettingModelMock,
  buildSiteSettingDoc,
} from './__test-helpers__/setting-test-fixtures';

describe('SettingService', () => {
  let service: SettingService;
  let siteSettingModel: ReturnType<typeof buildSettingModelMock>;

  beforeEach(async () => {
    siteSettingModel = buildSettingModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingService,
        {
          provide: getModelToken(SiteSetting.name),
          useValue: siteSettingModel,
        },
      ],
    }).compile();

    service = module.get<SettingService>(SettingService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSiteSettings', () => {
    it('returns default values when no records are in database', async () => {
      const chain = buildQueryChain([]);
      siteSettingModel.find.mockReturnValue(chain);

      const result = await service.getSiteSettings();

      expect(siteSettingModel.find).toHaveBeenCalled();
      expect(result.associationName).toBe(
        DEFAULT_SITE_SETTINGS[SiteSettingKey.ASSOCIATION_NAME],
      );
      expect(result.facebook).toBeUndefined();
    });

    it('returns populated site settings from database', async () => {
      const docs = [
        buildSiteSettingDoc({
          key: SiteSettingKey.ASSOCIATION_NAME,
          value: 'IPA Association',
        }),
        buildSiteSettingDoc({
          key: SiteSettingKey.FACEBOOK,
          value: 'https://facebook.com/ipa',
        }),
        buildSiteSettingDoc({
          key: SiteSettingKey.INSTAGRAM,
          value: 'https://instagram.com/ipa',
        }),
        buildSiteSettingDoc({
          key: SiteSettingKey.TELEGRAM,
          value: 'https://t.me/ipa',
        }),
        buildSiteSettingDoc({
          key: SiteSettingKey.WHATSAPP,
          value: 'https://wa.me/989121112222',
        }),
      ];
      const chain = buildQueryChain(docs);
      siteSettingModel.find.mockReturnValue(chain);

      const result = await service.getSiteSettings();

      expect(result.associationName).toBe('IPA Association');
      expect(result.facebook).toBe('https://facebook.com/ipa');
      expect(result.instagram).toBe('https://instagram.com/ipa');
      expect(result.telegram).toBe('https://t.me/ipa');
      expect(result.whatsapp).toBe('https://wa.me/989121112222');
      expect(result.socials).toEqual({
        facebook: 'https://facebook.com/ipa',
        instagram: 'https://instagram.com/ipa',
        telegram: 'https://t.me/ipa',
        whatsapp: 'https://wa.me/989121112222',
      });
    });
  });

  describe('getSiteSetting', () => {
    it('returns existing setting value from database', async () => {
      const doc = buildSiteSettingDoc({
        key: SiteSettingKey.ASSOCIATION_NAME,
        value: 'IPA Association',
      });
      const chain = buildQueryChain(doc);
      siteSettingModel.findOne.mockReturnValue(chain);

      const result = await service.getSiteSetting(
        SiteSettingKey.ASSOCIATION_NAME,
      );

      expect(siteSettingModel.findOne).toHaveBeenCalledWith({
        key: SiteSettingKey.ASSOCIATION_NAME,
      });
      expect(result).toBe('IPA Association');
    });

    it('falls back to default if setting not found in DB but known key', async () => {
      const chain = buildQueryChain(null);
      siteSettingModel.findOne.mockReturnValue(chain);

      const result = await service.getSiteSetting(
        SiteSettingKey.ASSOCIATION_NAME,
      );

      expect(result).toBe(
        DEFAULT_SITE_SETTINGS[SiteSettingKey.ASSOCIATION_NAME],
      );
    });

    it('throws NotFoundException if setting is unknown and not in DB', async () => {
      const chain = buildQueryChain(null);
      siteSettingModel.findOne.mockReturnValue(chain);

      await expect(service.getSiteSetting('unknown_key')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

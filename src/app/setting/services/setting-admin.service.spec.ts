import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { SettingAdminService } from './setting-admin.service';
import { SiteSetting, SiteSettingKey } from '../site-setting.schema';
import { MemberSetting, MemberSettingKey } from '../member-setting.schema';
import {
  buildMemberSettingDoc,
  buildQueryChain,
  buildSettingModelMock,
  buildSiteSettingDoc,
} from './__test-helpers__/setting-test-fixtures';

describe('SettingAdminService', () => {
  let service: SettingAdminService;
  let siteSettingModel: ReturnType<typeof buildSettingModelMock>;
  let memberSettingModel: ReturnType<typeof buildSettingModelMock>;

  beforeEach(async () => {
    siteSettingModel = buildSettingModelMock();
    memberSettingModel = buildSettingModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingAdminService,
        {
          provide: getModelToken(SiteSetting.name),
          useValue: siteSettingModel,
        },
        {
          provide: getModelToken(MemberSetting.name),
          useValue: memberSettingModel,
        },
      ],
    }).compile();

    service = module.get<SettingAdminService>(SettingAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSiteSettings', () => {
    it('returns all site settings as a key-value map with socials', async () => {
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.ASSOCIATION_NAME,
            value: 'IPA',
          }),
          buildSiteSettingDoc({
            key: SiteSettingKey.FACEBOOK,
            value: 'https://facebook.com/ipa',
          }),
        ]),
      );

      const result = await service.getSiteSettings();

      expect(result.associationName).toBe('IPA');
      expect(result.facebook).toBe('https://facebook.com/ipa');
      expect(result.socials?.facebook).toBe('https://facebook.com/ipa');
    });
  });

  describe('saveSiteSettings', () => {
    it('stores valid links and adds https scheme to a bare domain', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.INSTAGRAM,
            value: 'https://instagram.com/ipa_official',
          }),
        ]),
      );

      const result = await service.saveSiteSettings({
        instagram: 'instagram.com/ipa_official',
      });

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.INSTAGRAM },
        {
          $set: {
            key: SiteSettingKey.INSTAGRAM,
            value: 'https://instagram.com/ipa_official',
          },
        },
        { upsert: true, new: true },
      );
      expect(result.instagram).toBe('https://instagram.com/ipa_official');
    });

    it('refuses a handle that is not a link, keeping what was already stored', async () => {
      // Pre-populate DB so we can verify the old value survives the rejection
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.INSTAGRAM,
            value: 'https://instagram.com/ipa_original',
          }),
        ]),
      );

      await expect(
        service.saveSiteSettings({
          associationName: 'IPA Renamed',
          instagram: '@ipa_official',
        }),
      ).rejects.toThrow(BadRequestException);

      // Nothing was written — the whole save is refused atomically
      expect(siteSettingModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuses a foreign WhatsApp number rather than blanking it', async () => {
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.WHATSAPP,
            value: 'https://wa.me/989121112222',
          }),
        ]),
      );

      await expect(
        service.saveSiteSettings({
          whatsapp: '+1 415 555 0100',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(siteSettingModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('stores WhatsApp from Iranian phone format with folding of Persian digits', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.WHATSAPP,
            value: 'https://wa.me/989121112222',
          }),
        ]),
      );

      const result = await service.saveSiteSettings({
        whatsapp: '۰۹۱۲۱۱۱۲۲۲۲',
      });

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.WHATSAPP },
        {
          $set: {
            key: SiteSettingKey.WHATSAPP,
            value: 'https://wa.me/989121112222',
          },
        },
        { upsert: true, new: true },
      );
      expect(result.whatsapp).toBe('https://wa.me/989121112222');
    });

    it('still lets an empty field remove a link — that is not an error', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.TELEGRAM,
            value: '',
          }),
          buildSiteSettingDoc({
            key: SiteSettingKey.FACEBOOK,
            value: 'https://facebook.com/ipa',
          }),
        ]),
      );

      const result = await service.saveSiteSettings({
        telegram: '',
        facebook: 'https://facebook.com/ipa',
      });

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.TELEGRAM },
        { $set: { key: SiteSettingKey.TELEGRAM, value: '' } },
        { upsert: true, new: true },
      );
      expect(result.facebook).toBe('https://facebook.com/ipa');
    });

    it('updates associationName and logoKey', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));
      siteSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildSiteSettingDoc({
            key: SiteSettingKey.ASSOCIATION_NAME,
            value: 'New Association Name',
          }),
          buildSiteSettingDoc({
            key: SiteSettingKey.LOGO_KEY,
            value: 'logos/logo.png',
          }),
        ]),
      );

      const result = await service.saveSiteSettings({
        associationName: '  New Association Name  ',
        logoKey: 'logos/logo.png',
      });

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.ASSOCIATION_NAME },
        {
          $set: {
            key: SiteSettingKey.ASSOCIATION_NAME,
            value: 'New Association Name',
          },
        },
        { upsert: true, new: true },
      );
      expect(result.associationName).toBe('New Association Name');
      expect(result.logoKey).toBe('logos/logo.png');
    });
  });

  describe('setSiteSetting', () => {
    it('updates a single valid site setting', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      const result = await service.setSiteSetting(
        SiteSettingKey.INSTAGRAM,
        'instagram.com/ipa',
      );

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.INSTAGRAM },
        {
          $set: {
            key: SiteSettingKey.INSTAGRAM,
            value: 'https://instagram.com/ipa',
          },
        },
        { upsert: true, new: true },
      );
      expect(result).toEqual({
        key: SiteSettingKey.INSTAGRAM,
        value: 'https://instagram.com/ipa',
      });
    });

    it('throws BadRequestException when setting invalid social link', async () => {
      await expect(
        service.setSiteSetting(SiteSettingKey.FACEBOOK, 'not a valid url'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when setting invalid whatsapp link', async () => {
      await expect(
        service.setSiteSetting(SiteSettingKey.WHATSAPP, 'invalid whatsapp'),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows empty string to clear a social link without validation error', async () => {
      siteSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      const result = await service.setSiteSetting(SiteSettingKey.INSTAGRAM, '');

      expect(siteSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: SiteSettingKey.INSTAGRAM },
        { $set: { key: SiteSettingKey.INSTAGRAM, value: '' } },
        { upsert: true, new: true },
      );
      expect(result).toEqual({ key: SiteSettingKey.INSTAGRAM, value: '' });
    });
  });

  describe('getMemberSettings & getMemberSetting & setMemberSetting', () => {
    it('retrieves all member settings', async () => {
      memberSettingModel.find.mockReturnValue(
        buildQueryChain([
          buildMemberSettingDoc({
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '1050',
          }),
        ]),
      );

      const result = await service.getMemberSettings();
      expect(result).toEqual({
        [MemberSettingKey.MEMBERSHIP_NO_SEQUENCE]: '1050',
      });
    });

    it('retrieves single member setting', async () => {
      memberSettingModel.findOne.mockReturnValue(
        buildQueryChain(
          buildMemberSettingDoc({
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '1050',
          }),
        ),
      );

      const result = await service.getMemberSetting(
        MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
      );
      expect(result).toBe('1050');
    });

    it('updates member setting', async () => {
      memberSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      const result = await service.setMemberSetting(
        MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
        '2000',
      );

      expect(memberSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE },
        {
          $set: {
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '2000',
          },
        },
        { upsert: true, new: true },
      );
      expect(result).toEqual({
        key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
        value: '2000',
      });
    });
  });

  describe('getNextMembershipNoSequence', () => {
    it('increments sequence starting from base 1000 if none existed', async () => {
      memberSettingModel.findOne.mockReturnValue(buildQueryChain(null));
      memberSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      const nextNo = await service.getNextMembershipNoSequence();

      expect(nextNo).toBe(1000);
      expect(memberSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE },
        {
          $set: {
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '1000',
          },
        },
        { upsert: true, new: true },
      );
    });

    it('increments existing sequence number', async () => {
      memberSettingModel.findOne.mockReturnValue(
        buildQueryChain(
          buildMemberSettingDoc({
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '1042',
          }),
        ),
      );
      memberSettingModel.findOneAndUpdate.mockReturnValue(buildQueryChain({}));

      const nextNo = await service.getNextMembershipNoSequence();

      expect(nextNo).toBe(1043);
      expect(memberSettingModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE },
        {
          $set: {
            key: MemberSettingKey.MEMBERSHIP_NO_SEQUENCE,
            value: '1043',
          },
        },
        { upsert: true, new: true },
      );
    });
  });

  describe('seed', () => {
    it('idempotently seeds default site and member settings', async () => {
      siteSettingModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      memberSettingModel.updateOne.mockResolvedValue({ upsertedCount: 1 });
      siteSettingModel.countDocuments.mockReturnValue(buildQueryChain(6));
      memberSettingModel.countDocuments.mockReturnValue(buildQueryChain(1));

      const result = await service.seed();

      expect(siteSettingModel.updateOne).toHaveBeenCalled();
      expect(memberSettingModel.updateOne).toHaveBeenCalled();
      expect(result.seededSite).toBeGreaterThan(0);
      expect(result.seededMember).toBeGreaterThan(0);
      expect(result.total).toBe(7);
    });
  });
});

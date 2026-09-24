import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteSetting, SiteSettingKey } from '../site-setting.schema';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';
import { DEFAULT_SITE_SETTINGS } from '../constants/default-settings';
import { translate } from '../../../common/utils/translate';
import { ISettingService } from '../interfaces/setting-service.interface';

/**
 * Public/Client Setting Service.
 * Follows Single Responsibility Principle (SRP) — handles read queries
 * for public website settings with no mutation capabilities.
 */
@Injectable()
export class SettingService implements ISettingService {
  constructor(
    @InjectModel(SiteSetting.name)
    private readonly siteSettingModel: Model<SiteSetting>,
  ) {}

  /**
   * Retrieves all public site settings with structured social links.
   * Falls back to canonical defaults when values are not explicitly set in the database.
   */
  async getSiteSettings(): Promise<SiteSettingsResponseDto> {
    const rows = await this.siteSettingModel.find().exec();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const associationName =
      map[SiteSettingKey.ASSOCIATION_NAME] ??
      DEFAULT_SITE_SETTINGS[SiteSettingKey.ASSOCIATION_NAME];
    const logoKey = map[SiteSettingKey.LOGO_KEY] ?? '';
    const facebook = map[SiteSettingKey.FACEBOOK] ?? '';
    const instagram = map[SiteSettingKey.INSTAGRAM] ?? '';
    const telegram = map[SiteSettingKey.TELEGRAM] ?? '';
    const whatsapp = map[SiteSettingKey.WHATSAPP] ?? '';

    return {
      associationName,
      logoKey: logoKey || undefined,
      facebook: facebook || undefined,
      instagram: instagram || undefined,
      telegram: telegram || undefined,
      whatsapp: whatsapp || undefined,
      socials: {
        facebook: facebook || undefined,
        instagram: instagram || undefined,
        telegram: telegram || undefined,
        whatsapp: whatsapp || undefined,
      },
      all: map,
    };
  }

  /**
   * Retrieves a single site setting value by key.
   */
  async getSiteSetting(key: string): Promise<string | undefined> {
    const row = await this.siteSettingModel.findOne({ key }).exec();
    if (row) {
      return row.value;
    }

    if (key in DEFAULT_SITE_SETTINGS) {
      return DEFAULT_SITE_SETTINGS[key as SiteSettingKey];
    }

    throw new NotFoundException(translate('errors.SETTING_NOT_FOUND'));
  }
}

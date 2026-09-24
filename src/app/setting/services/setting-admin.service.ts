import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteSetting, SiteSettingKey } from '../site-setting.schema';
import { MemberSetting, MemberSettingKey } from '../member-setting.schema';
import { SaveSiteSettingsDto } from '../dtos/save-site-settings.dto';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';
import {
  DEFAULT_MEMBER_SETTINGS,
  DEFAULT_SITE_SETTINGS,
} from '../constants/default-settings';
import { translate } from '../../../common/utils/translate';
import {
  normalizeSocialUrl,
  normalizeWhatsapp,
} from '../../../common/utils/social-url.util';
import { ISettingAdminService } from '../interfaces/setting-admin-service.interface';

/** Base sequence number for membership numbers if none exists yet. */
const MEMBERSHIP_BASE_SEQ = 1000;

/**
 * Administrative Setting Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative management of site settings, validation and normalization
 * of social links, member workflow settings, and canonical seeding.
 */
@Injectable()
export class SettingAdminService implements ISettingAdminService {
  constructor(
    @InjectModel(SiteSetting.name)
    private readonly siteSettingModel: Model<SiteSetting>,
    @InjectModel(MemberSetting.name)
    private readonly memberSettingModel: Model<MemberSetting>,
  ) {}

  /**
   * Retrieves all site settings for administration.
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
   * Retrieves a single site setting by key.
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

  /**
   * Updates site settings in bulk with validation and normalization of social links.
   * If any provided non-empty social value cannot be parsed or normalized,
   * the entire save is rejected to prevent silent data corruption.
   */
  async saveSiteSettings(
    dto: SaveSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    const invalidKeys: string[] = [];

    // Social validation pass — refuses whole save rather than silently saving broken links
    if (dto.facebook !== undefined && dto.facebook.trim() !== '') {
      if (!normalizeSocialUrl(dto.facebook)) {
        invalidKeys.push(SiteSettingKey.FACEBOOK);
      }
    }

    if (dto.instagram !== undefined && dto.instagram.trim() !== '') {
      if (!normalizeSocialUrl(dto.instagram)) {
        invalidKeys.push(SiteSettingKey.INSTAGRAM);
      }
    }

    if (dto.telegram !== undefined && dto.telegram.trim() !== '') {
      if (!normalizeSocialUrl(dto.telegram)) {
        invalidKeys.push(SiteSettingKey.TELEGRAM);
      }
    }

    if (dto.whatsapp !== undefined && dto.whatsapp.trim() !== '') {
      if (!normalizeWhatsapp(dto.whatsapp)) {
        invalidKeys.push(SiteSettingKey.WHATSAPP);
      }
    }

    if (invalidKeys.length > 0) {
      throw new BadRequestException(translate('errors.INVALID_SOCIAL_URL'));
    }

    const updates: Record<string, string> = {};

    if (dto.associationName !== undefined) {
      updates[SiteSettingKey.ASSOCIATION_NAME] = dto.associationName.trim();
    }

    if (dto.logoKey !== undefined) {
      updates[SiteSettingKey.LOGO_KEY] = dto.logoKey.trim();
    }

    if (dto.facebook !== undefined) {
      updates[SiteSettingKey.FACEBOOK] = normalizeSocialUrl(dto.facebook);
    }

    if (dto.instagram !== undefined) {
      updates[SiteSettingKey.INSTAGRAM] = normalizeSocialUrl(dto.instagram);
    }

    if (dto.telegram !== undefined) {
      updates[SiteSettingKey.TELEGRAM] = normalizeSocialUrl(dto.telegram);
    }

    if (dto.whatsapp !== undefined) {
      updates[SiteSettingKey.WHATSAPP] = normalizeWhatsapp(dto.whatsapp);
    }

    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        this.siteSettingModel
          .findOneAndUpdate(
            { key },
            { $set: { key, value } },
            { upsert: true, new: true },
          )
          .exec(),
      ),
    );

    return this.getSiteSettings();
  }

  /**
   * Sets or creates a single site setting key-value pair.
   */
  async setSiteSetting(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string }> {
    const trimmed = value.trim();

    if (
      key === (SiteSettingKey.FACEBOOK as string) ||
      key === (SiteSettingKey.INSTAGRAM as string) ||
      key === (SiteSettingKey.TELEGRAM as string)
    ) {
      if (trimmed !== '') {
        const normalized = normalizeSocialUrl(trimmed);
        if (!normalized) {
          throw new BadRequestException(translate('errors.INVALID_SOCIAL_URL'));
        }
        value = normalized;
      }
    } else if (key === (SiteSettingKey.WHATSAPP as string)) {
      if (trimmed !== '') {
        const normalized = normalizeWhatsapp(trimmed);
        if (!normalized) {
          throw new BadRequestException(translate('errors.INVALID_SOCIAL_URL'));
        }
        value = normalized;
      }
    }

    await this.siteSettingModel
      .findOneAndUpdate(
        { key },
        { $set: { key, value } },
        { upsert: true, new: true },
      )
      .exec();

    return { key, value };
  }

  /**
   * Retrieves all member workflow settings as a key-value dictionary.
   */
  async getMemberSettings(): Promise<Record<string, string>> {
    const rows = await this.memberSettingModel.find().exec();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  /**
   * Retrieves a single member setting by key.
   */
  async getMemberSetting(key: string): Promise<string | undefined> {
    const row = await this.memberSettingModel.findOne({ key }).exec();
    if (row) {
      return row.value;
    }

    if (key in DEFAULT_MEMBER_SETTINGS) {
      return DEFAULT_MEMBER_SETTINGS[key as MemberSettingKey];
    }

    throw new NotFoundException(translate('errors.SETTING_NOT_FOUND'));
  }

  /**
   * Updates or creates a member setting key-value pair.
   */
  async setMemberSetting(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string }> {
    await this.memberSettingModel
      .findOneAndUpdate(
        { key },
        { $set: { key, value: value.trim() } },
        { upsert: true, new: true },
      )
      .exec();

    return { key, value: value.trim() };
  }

  /**
   * Atomically gets and increments the next membership sequence number.
   */
  async getNextMembershipNoSequence(): Promise<number> {
    const key = MemberSettingKey.MEMBERSHIP_NO_SEQUENCE;
    const current = await this.memberSettingModel.findOne({ key }).exec();

    const nextSeq = current ? Number(current.value) + 1 : MEMBERSHIP_BASE_SEQ;

    await this.memberSettingModel
      .findOneAndUpdate(
        { key },
        { $set: { key, value: String(nextSeq) } },
        { upsert: true, new: true },
      )
      .exec();

    return nextSeq;
  }

  /**
   * Idempotently seeds default site and member settings if not already present.
   */
  async seed(): Promise<{
    seededSite: number;
    seededMember: number;
    total: number;
  }> {
    let seededSite = 0;
    let seededMember = 0;

    for (const [key, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
      const res = await this.siteSettingModel.updateOne(
        { key },
        { $setOnInsert: { key, value } },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        seededSite++;
      }
    }

    for (const [key, value] of Object.entries(DEFAULT_MEMBER_SETTINGS)) {
      const res = await this.memberSettingModel.updateOne(
        { key },
        { $setOnInsert: { key, value } },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        seededMember++;
      }
    }

    const [siteCount, memberCount] = await Promise.all([
      this.siteSettingModel.countDocuments().exec(),
      this.memberSettingModel.countDocuments().exec(),
    ]);

    return {
      seededSite,
      seededMember,
      total: siteCount + memberCount,
    };
  }
}

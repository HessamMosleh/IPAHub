import { SaveSiteSettingsDto } from '../dtos/save-site-settings.dto';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';

/**
 * Contract for administrative setting operations.
 * Segregated from the public client interface (ISP).
 */
export interface ISettingAdminService {
  /**
   * Retrieves all site settings for administration.
   */
  getSiteSettings(): Promise<SiteSettingsResponseDto>;

  /**
   * Retrieves a single site setting by key.
   */
  getSiteSetting(key: string): Promise<string | undefined>;

  /**
   * Updates site settings in bulk with validation and normalization of social links.
   * Rejects entire save if any provided social link is invalid.
   */
  saveSiteSettings(dto: SaveSiteSettingsDto): Promise<SiteSettingsResponseDto>;

  /**
   * Sets or creates a single site setting key-value pair.
   */
  setSiteSetting(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string }>;

  /**
   * Retrieves all member workflow settings.
   */
  getMemberSettings(): Promise<Record<string, string>>;

  /**
   * Retrieves a single member setting by key.
   */
  getMemberSetting(key: string): Promise<string | undefined>;

  /**
   * Updates or creates a member setting key-value pair.
   */
  setMemberSetting(
    key: string,
    value: string,
  ): Promise<{ key: string; value: string }>;

  /**
   * Atomically gets and increments the next membership sequence number.
   */
  getNextMembershipNoSequence(): Promise<number>;

  /**
   * Idempotently seeds default site and member settings if not already present.
   */
  seed(): Promise<{
    seededSite: number;
    seededMember: number;
    total: number;
  }>;
}

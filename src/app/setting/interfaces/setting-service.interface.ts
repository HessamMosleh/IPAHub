import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';

/**
 * Contract for public/client setting queries.
 * Adheres to Interface Segregation Principle (ISP) — client consumers
 * only see read operations for public site settings.
 */
export interface ISettingService {
  /**
   * Retrieves all public site settings with structured social links.
   */
  getSiteSettings(): Promise<SiteSettingsResponseDto>;

  /**
   * Retrieves a single site setting value by key.
   * Throws NotFoundException if setting not found.
   */
  getSiteSetting(key: string): Promise<string | undefined>;
}

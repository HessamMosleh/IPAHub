import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSetting, SiteSettingSchema } from './site-setting.schema';
import { MemberSetting, MemberSettingSchema } from './member-setting.schema';
import { SettingService } from './services/setting.service';
import { SettingAdminService } from './services/setting-admin.service';
import { SettingController } from './controllers/setting.controller';
import { SettingAdminController } from './controllers/setting-admin.controller';

/**
 * Setting Feature Module.
 * Provides public client and administrative services/controllers for site-wide
 * configurations (name, logo, socials) and member workflow sequence settings.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Public read queries separated from administrative mutations
 * - Interface Segregation: Distinct interfaces for client (ISettingService) and admin (ISettingAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteSetting.name, schema: SiteSettingSchema },
      { name: MemberSetting.name, schema: MemberSettingSchema },
    ]),
  ],
  controllers: [SettingController, SettingAdminController],
  providers: [SettingService, SettingAdminService],
  exports: [SettingService, SettingAdminService, MongooseModule],
})
export class SettingModule {}

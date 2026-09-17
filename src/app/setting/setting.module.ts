import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSetting, SiteSettingSchema } from './site-setting.schema';
import { MemberSetting, MemberSettingSchema } from './member-setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteSetting.name, schema: SiteSettingSchema },
      { name: MemberSetting.name, schema: MemberSettingSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SettingModule {}

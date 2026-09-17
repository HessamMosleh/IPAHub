import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { ProvinceService } from './services/province.service';
import { ProvinceAdminService } from './services/province-admin.service';
import { ProvinceController } from './controllers/province.controller';
import { ProvinceAdminController } from './controllers/province-admin.controller';

/**
 * Province Feature Module.
 * Provides public client and administrative services/controllers for Iran's provinces.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IProvinceService) and admin (IProvinceAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [ProvinceController, ProvinceAdminController],
  providers: [ProvinceService, ProvinceAdminService],
  exports: [ProvinceService, ProvinceAdminService, MongooseModule],
})
export class ProvinceModule {}

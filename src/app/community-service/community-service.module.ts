import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CommunityService,
  CommunityServiceSchema,
} from './community-service.schema';
import { CommunityServiceService } from './services/community-service.service';
import { CommunityServiceAdminService } from './services/community-service-admin.service';
import { CommunityServiceController } from './controllers/community-service.controller';
import { CommunityServiceAdminController } from './controllers/community-service-admin.controller';

/**
 * Community Service Feature Module.
 * Provides public client and administrative services/controllers for community services.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries (CommunityServiceService/CommunityServiceController) separated from admin mutations (CommunityServiceAdminService/CommunityServiceAdminController)
 * - Interface Segregation: Distinct interfaces for client (ICommunityServiceService) and admin (ICommunityServiceAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityService.name, schema: CommunityServiceSchema },
    ]),
  ],
  controllers: [CommunityServiceController, CommunityServiceAdminController],
  providers: [CommunityServiceService, CommunityServiceAdminService],
  exports: [
    CommunityServiceService,
    CommunityServiceAdminService,
    MongooseModule,
  ],
})
export class CommunityServiceModule {}

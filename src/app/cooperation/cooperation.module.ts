import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CooperationRequest,
  CooperationRequestSchema,
} from './cooperation-request.schema';
import { User, UserSchema } from '../user/user.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { CooperationService } from './services/cooperation.service';
import { CooperationAdminService } from './services/cooperation-admin.service';
import { CooperationController } from './controllers/cooperation.controller';
import { CooperationAdminController } from './controllers/cooperation-admin.controller';

/**
 * Cooperation Feature Module.
 * Provides member client and administrative services/controllers for cooperation proposals.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client operations (CooperationService/CooperationController) separated from admin operations (CooperationAdminService/CooperationAdminController)
 * - Interface Segregation: Distinct interfaces for client (ICooperationService) and admin (ICooperationAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CooperationRequest.name, schema: CooperationRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [CooperationController, CooperationAdminController],
  providers: [CooperationService, CooperationAdminService],
  exports: [CooperationService, CooperationAdminService, MongooseModule],
})
export class CooperationModule {}

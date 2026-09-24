import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestType, RequestTypeSchema } from './request-type.schema';
import {
  DocumentRequest,
  DocumentRequestSchema,
} from '../document-request/document-request.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { RequestTypeService } from './services/request-type.service';
import { RequestTypeAdminService } from './services/request-type-admin.service';
import { RequestTypeController } from './controllers/request-type.controller';
import { RequestTypeAdminController } from './controllers/request-type-admin.controller';

/**
 * Request Type Feature Module.
 * Provides public client and administrative services/controllers for association request types.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IRequestTypeService) and admin (IRequestTypeAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequestType.name, schema: RequestTypeSchema },
      { name: DocumentRequest.name, schema: DocumentRequestSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [RequestTypeController, RequestTypeAdminController],
  providers: [RequestTypeService, RequestTypeAdminService],
  exports: [RequestTypeService, RequestTypeAdminService, MongooseModule],
})
export class RequestTypeModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentRequest,
  DocumentRequestSchema,
} from './document-request.schema';
import {
  RequestType,
  RequestTypeSchema,
} from '../request-type/request-type.schema';
import { User, UserSchema } from '../user/user.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { DocumentRequestService } from './services/document-request.service';
import { DocumentRequestAdminService } from './services/document-request-admin.service';
import { DocumentRequestController } from './controllers/document-request.controller';
import { DocumentRequestAdminController } from './controllers/document-request-admin.controller';

/**
 * Document Request Feature Module.
 * Provides member self-service and administrative management for document requests.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Member queries and requests separated from admin reviews and fulfillment
 * - Interface Segregation: Distinct interfaces for client (IDocumentRequestService) and admin (IDocumentRequestAdminService)
 * - Dependency Inversion: Service providers injected into controllers; models injected into services
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentRequest.name, schema: DocumentRequestSchema },
      { name: RequestType.name, schema: RequestTypeSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [DocumentRequestController, DocumentRequestAdminController],
  providers: [DocumentRequestService, DocumentRequestAdminService],
  exports: [
    DocumentRequestService,
    DocumentRequestAdminService,
    MongooseModule,
  ],
})
export class DocumentRequestModule {}

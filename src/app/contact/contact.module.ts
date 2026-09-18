import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactInfo, ContactInfoSchema } from './schemas/contact-info.schema';
import {
  ContactMessage,
  ContactMessageSchema,
} from './schemas/contact-message.schema';
import { ContactService } from './services/contact.service';
import { ContactAdminService } from './services/contact-admin.service';
import { ContactController } from './controllers/contact.controller';
import { ContactAdminController } from './controllers/contact-admin.controller';

/**
 * Contact Feature Module.
 * Provides public client and administrative services/controllers for contact info and visitor messages.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client operations (ContactService/ContactController) separated from admin operations (ContactAdminService/ContactAdminController)
 * - Interface Segregation: Distinct interfaces for client (IContactService) and admin (IContactAdminService)
 * - Dependency Inversion: Clean injection of service abstractions into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactInfo.name, schema: ContactInfoSchema },
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
  ],
  controllers: [ContactController, ContactAdminController],
  providers: [ContactService, ContactAdminService],
  exports: [ContactService, ContactAdminService, MongooseModule],
})
export class ContactModule {}

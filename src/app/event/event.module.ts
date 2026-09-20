import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './event.schema';
import {
  EventRegistration,
  EventRegistrationSchema,
} from './event-registration.schema';
import { User, UserSchema } from '../user/user.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { EventService } from './services/event.service';
import { EventAdminService } from './services/event-admin.service';
import { EventController } from './controllers/event.controller';
import { EventAdminController } from './controllers/event-admin.controller';

/**
 * Event Feature Module.
 * Provides public client, member self-service, and administrative services/controllers
 * for workshops and conferences.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries/registrations separated from admin mutations/lifecycle
 * - Interface Segregation: Distinct interfaces for client (IEventService) and admin (IEventAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventRegistration.name, schema: EventRegistrationSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [EventController, EventAdminController],
  providers: [EventService, EventAdminService],
  exports: [EventService, EventAdminService, MongooseModule],
})
export class EventModule {}

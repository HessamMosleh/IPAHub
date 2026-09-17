import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './event.schema';
import {
  EventRegistration,
  EventRegistrationSchema,
} from './event-registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: EventRegistration.name, schema: EventRegistrationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class EventModule {}

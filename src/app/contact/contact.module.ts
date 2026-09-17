import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactInfo, ContactInfoSchema } from './contact-info.schema';
import { ContactMessage, ContactMessageSchema } from './contact-message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactInfo.name, schema: ContactInfoSchema },
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ContactModule {}

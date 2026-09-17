import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DocumentRequest,
  DocumentRequestSchema,
} from './document-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentRequest.name, schema: DocumentRequestSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DocumentRequestModule {}

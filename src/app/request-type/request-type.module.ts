import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestType, RequestTypeSchema } from './request-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequestType.name, schema: RequestTypeSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class RequestTypeModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CooperationRequest,
  CooperationRequestSchema,
} from './cooperation-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CooperationRequest.name, schema: CooperationRequestSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CooperationModule {}

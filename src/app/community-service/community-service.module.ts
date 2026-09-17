import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CommunityService,
  CommunityServiceSchema,
} from './community-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityService.name, schema: CommunityServiceSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CommunityServiceModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberFeedback, MemberFeedbackSchema } from './member-feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberFeedback.name, schema: MemberFeedbackSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class FeedbackModule {}

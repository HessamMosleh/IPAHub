import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MemberFeedback,
  MemberFeedbackSchema,
} from './member-feedback.schema';
import { User, UserSchema } from '../user/user.schema';
import { FeedbackService } from './services/feedback.service';
import { FeedbackAdminService } from './services/feedback-admin.service';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackAdminController } from './controllers/feedback-admin.controller';

/**
 * Feedback Feature Module.
 * Provides member self-service and administrative management for member feedback messages.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Member submissions separated from admin reviews and resolution
 * - Interface Segregation: Distinct interfaces for client (IFeedbackService) and admin (IFeedbackAdminService)
 * - Dependency Inversion: Service providers injected into controllers; models injected into services
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberFeedback.name, schema: MemberFeedbackSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService, FeedbackAdminService],
  exports: [FeedbackService, FeedbackAdminService, MongooseModule],
})
export class FeedbackModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { MemberDocument, MemberDocumentSchema } from './member-document.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import {
  MembershipRequest,
  MembershipRequestSchema,
} from '../membership/schemas/membership-request.schema';
import { UserAdminService } from './services/user-admin.service';
import { UserAdminController } from './controllers/user-admin.controller';
import { SmsSender } from '../auth/sms.stub';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

/**
 * User Feature Module.
 * Provides member self-service (`/user/me…`) and administrative management
 * (`/admin/user…` for the member directory and `/admin/user/admins` for
 * province-admin CRUD). Fully decoupled following SOLID principles:
 * - Single Responsibility: client profile/documents separated from admin review
 * - Interface Segregation: admin operations live on IUserAdminService
 * - Dependency Inversion: services injected into controllers; models into services
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MemberDocument.name, schema: MemberDocumentSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: MembershipRequest.name, schema: MembershipRequestSchema },
    ]),
  ],
  providers: [UserService, UserAdminService, SmsSender],
  exports: [UserService, UserAdminService, MongooseModule],
  controllers: [UserController, UserAdminController],
})
export class UserModule {}

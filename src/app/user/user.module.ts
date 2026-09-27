import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

const LEGACY_STORAGE_KEY_INDEX = 'storageKey_1';

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
export class UserModule implements OnModuleInit {
  private readonly logger = new Logger(UserModule.name);

  constructor(
    @InjectModel(MemberDocument.name)
    private readonly memberDocumentModel: Model<MemberDocument>,
  ) {}

  /**
   * `MemberDocument.storageKey` was replaced by `file`, but Mongoose never drops
   * indexes, so databases created before the change keep a unique index on
   * `storageKey` that every new row violates with `null`.
   */
  async onModuleInit(): Promise<void> {
    try {
      const collection = this.memberDocumentModel.collection;
      if (await collection.indexExists(LEGACY_STORAGE_KEY_INDEX)) {
        await collection.dropIndex(LEGACY_STORAGE_KEY_INDEX);
        this.logger.log(`Dropped legacy index ${LEGACY_STORAGE_KEY_INDEX}`);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to drop legacy index ${LEGACY_STORAGE_KEY_INDEX}: ${String(err)}`,
      );
    }
  }
}

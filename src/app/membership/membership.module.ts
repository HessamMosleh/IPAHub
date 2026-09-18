import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MembershipFee,
  MembershipFeeSchema,
} from './schemas/membership-fee.schema';
import {
  MembershipTypeInfo,
  MembershipTypeInfoSchema,
} from './schemas/membership-type-info.schema';
import {
  MembershipRequest,
  MembershipRequestSchema,
} from './schemas/membership-request.schema';
import {
  MembershipCard,
  MembershipCardSchema,
} from './schemas/membership-card.schema';
import { User, UserSchema } from '../user/user.schema';
import {
  MemberDocument,
  MemberDocumentSchema,
} from '../user/member-document.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { MembershipService } from './services/membership.service';
import { MembershipAdminService } from './services/membership-admin.service';
import { MembershipActivationService } from './services/membership-activation.service';
import { MembershipController } from './controllers/membership.controller';
import { MembershipAdminController } from './controllers/membership-admin.controller';

/**
 * Membership Feature Module.
 * Provides member-client and administrative services/controllers for membership
 * tiers, applications, renewals, fees and tier copy. Fully decoupled following
 * SOLID principles:
 * - Single Responsibility: client operations (MembershipService/MembershipController)
 *   separated from admin operations (MembershipAdminService/MembershipAdminController);
 *   activation is its own MembershipActivationService.
 * - Interface Segregation: distinct interfaces for client (IMembershipService) and
 *   admin (IMembershipAdminService).
 * - Dependency Inversion: pricing/term/form logic lives in pure utils and shared
 *   services injected into the controllers.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MembershipFee.name, schema: MembershipFeeSchema },
      { name: MembershipTypeInfo.name, schema: MembershipTypeInfoSchema },
      { name: MembershipRequest.name, schema: MembershipRequestSchema },
      { name: MembershipCard.name, schema: MembershipCardSchema },
      { name: User.name, schema: UserSchema },
      { name: MemberDocument.name, schema: MemberDocumentSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [MembershipController, MembershipAdminController],
  providers: [
    MembershipService,
    MembershipAdminService,
    MembershipActivationService,
  ],
  exports: [
    MembershipService,
    MembershipAdminService,
    MembershipActivationService,
    MongooseModule,
  ],
})
export class MembershipModule {}

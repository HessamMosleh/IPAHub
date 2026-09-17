import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipFee, MembershipFeeSchema } from './membership-fee.schema';
import {
  MembershipTypeInfo,
  MembershipTypeInfoSchema,
} from './membership-type-info.schema';
import {
  MembershipRequest,
  MembershipRequestSchema,
} from './membership-request.schema';
import { MembershipCard, MembershipCardSchema } from './membership-card.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MembershipFee.name, schema: MembershipFeeSchema },
      { name: MembershipTypeInfo.name, schema: MembershipTypeInfoSchema },
      { name: MembershipRequest.name, schema: MembershipRequestSchema },
      { name: MembershipCard.name, schema: MembershipCardSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MembershipModule {}

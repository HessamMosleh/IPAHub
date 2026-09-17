import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { MemberDocument, MemberDocumentSchema } from './member-document.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: MemberDocument.name, schema: MemberDocumentSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  providers: [UserService],
  exports: [UserService, MongooseModule],
  controllers: [UserController],
})
export class UserModule {}

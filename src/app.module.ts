import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as Joi from 'joi';
import { join } from 'path';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { LanguageEnum } from './common/enums/language.enum';
import { NewsModule } from './app/news/news.module';
import { ProvinceModule } from './app/province/province.module';
import { PageModule } from './app/page/page.module';
import { GalleryModule } from './app/gallery/gallery.module';
import { CommunityServiceModule } from './app/community-service/community-service.module';
import { PersonModule } from './app/person/person.module';
import { BoardModule } from './app/board/board.module';
import { ContactModule } from './app/contact/contact.module';
import { SettingModule } from './app/setting/setting.module';
import { RequestTypeModule } from './app/request-type/request-type.module';
import { DocumentRequestModule } from './app/document-request/document-request.module';
import { MembershipModule } from './app/membership/membership.module';
import { EventModule } from './app/event/event.module';
import { CooperationModule } from './app/cooperation/cooperation.module';
import { FeedbackModule } from './app/feedback/feedback.module';
import { PaymentModule } from './app/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        MONGO_URI: Joi.string()
          .uri({ scheme: ['mongodb', 'mongodb+srv'] })
          .required(),
        JWT_ACCESS_SECRET: Joi.string().min(16).required(),
        JWT_REFRESH_SECRET: Joi.string().min(16).required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        MINIO_ENDPOINT: Joi.string().default('minio'),
        MINIO_PORT: Joi.number().default(9000),
        MINIO_USE_SSL: Joi.boolean().default(false),
        MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
        MINIO_SECRET_KEY: Joi.string().default('minioadmin'),
        MINIO_BUCKET: Joi.string().default('pcahub'),
        FALLBACK_LANGUAGE: Joi.string()
          .valid(...Object.values(LanguageEnum))
          .default(LanguageEnum.FA),
      }),
    }),
    I18nModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.get<string>(
          'FALLBACK_LANGUAGE',
          LanguageEnum.FA,
        ),
        loaderOptions: {
          path: join(__dirname, '/i18n/'),
          watch: false,
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    ProvinceModule,
    // Public content
    NewsModule,
    PageModule,
    GalleryModule,
    CommunityServiceModule,
    PersonModule,
    BoardModule,
    ContactModule,
    // Member workflows
    MembershipModule,
    RequestTypeModule,
    DocumentRequestModule,
    EventModule,
    CooperationModule,
    FeedbackModule,
    // Money and ops
    PaymentModule,
    SettingModule,
  ],
})
export class AppModule {}

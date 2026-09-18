import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { News, NewsSchema } from './news.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { NewsService } from './services/news.service';
import { NewsAdminService } from './services/news-admin.service';
import { NewsController } from './controllers/news.controller';
import { NewsAdminController } from './controllers/news-admin.controller';

/**
 * News Feature Module.
 * Provides public client and administrative services/controllers for news posts.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (INewsService) and admin (INewsAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: News.name, schema: NewsSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [NewsController, NewsAdminController],
  providers: [NewsService, NewsAdminService],
  exports: [NewsService, NewsAdminService, MongooseModule],
})
export class NewsModule {}

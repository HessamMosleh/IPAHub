import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from './article.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { ArticleService } from './services/article.service';
import { ArticleAdminService } from './services/article-admin.service';
import { ArticleController } from './controllers/article.controller';
import { ArticleAdminController } from './controllers/article-admin.controller';

/**
 * Article Feature Module.
 * Provides public client and administrative services/controllers for articles.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IArticleService) and admin (IArticleAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Article.name, schema: ArticleSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [ArticleController, ArticleAdminController],
  providers: [ArticleService, ArticleAdminService],
  exports: [ArticleService, ArticleAdminService, MongooseModule],
})
export class ArticleModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Page, PageSchema } from './page.schema';
import { PageService } from './services/page.service';
import { PageAdminService } from './services/page-admin.service';
import { PageController } from './controllers/page.controller';
import { PageAdminController } from './controllers/page-admin.controller';

/**
 * Page Feature Module.
 * Provides public client and administrative services/controllers for static CMS pages.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IPageService) and admin (IPageAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }]),
  ],
  controllers: [PageController, PageAdminController],
  providers: [PageService, PageAdminService],
  exports: [PageService, PageAdminService, MongooseModule],
})
export class PageModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GalleryImage, GalleryImageSchema } from './gallery-image.schema';
import { GalleryService } from './services/gallery.service';
import { GalleryAdminService } from './services/gallery-admin.service';
import { GalleryController } from './controllers/gallery.controller';
import { GalleryAdminController } from './controllers/gallery-admin.controller';

/**
 * Gallery Feature Module.
 * Provides public client and administrative services/controllers for home-page gallery slides.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IGalleryService) and admin (IGalleryAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GalleryImage.name, schema: GalleryImageSchema },
    ]),
  ],
  controllers: [GalleryController, GalleryAdminController],
  providers: [GalleryService, GalleryAdminService],
  exports: [GalleryService, GalleryAdminService, MongooseModule],
})
export class GalleryModule {}

import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageService } from './services/storage.service';
import { StorageController } from './storage.controller';
import { MediaService } from './services/media.service';
import { MediaUpload, MediaUploadSchema } from './media-upload.schema';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: MediaUpload.name, schema: MediaUploadSchema },
    ]),
  ],
  controllers: [StorageController],
  providers: [StorageService, MediaService],
  exports: [StorageService, MediaService],
})
export class StorageModule {}

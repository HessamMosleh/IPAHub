import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GalleryImage, GalleryImageSchema } from './gallery-image.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GalleryImage.name, schema: GalleryImageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class GalleryModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Upload, UploadSchema } from './upload.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Upload.name, schema: UploadSchema }]),
  ],
  exports: [MongooseModule],
})
export class UploadModule {}

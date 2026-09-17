import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { News, NewsSchema } from './news.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: News.name, schema: NewsSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  providers: [NewsService],
  controllers: [NewsController],
  exports: [NewsService],
})
export class NewsModule {}

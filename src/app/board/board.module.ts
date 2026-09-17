import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardTerm, BoardTermSchema } from './board-term.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BoardTerm.name, schema: BoardTermSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class BoardModule {}

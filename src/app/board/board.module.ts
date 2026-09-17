import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardTerm, BoardTermSchema } from './board-term.schema';
import { Person, PersonSchema } from '../person/person.schema';
import { BoardService } from './services/board.service';
import { BoardAdminService } from './services/board-admin.service';
import { BoardController } from './controllers/board.controller';
import { BoardAdminController } from './controllers/board-admin.controller';

/**
 * Board Feature Module.
 * Provides public client and administrative services/controllers for the Board of Directors terms and rosters.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries (BoardService/BoardController) separated from admin mutations (BoardAdminService/BoardAdminController)
 * - Interface Segregation: Distinct interfaces for client (IBoardService) and admin (IBoardAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BoardTerm.name, schema: BoardTermSchema },
      { name: Person.name, schema: PersonSchema },
    ]),
  ],
  controllers: [BoardController, BoardAdminController],
  providers: [BoardService, BoardAdminService],
  exports: [BoardService, BoardAdminService, MongooseModule],
})
export class BoardModule {}

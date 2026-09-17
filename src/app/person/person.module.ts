import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from './person.schema';
import { Province, ProvinceSchema } from '../../common/schemas/province.schema';
import { PersonService } from './services/person.service';
import { PersonAdminService } from './services/person-admin.service';
import { PersonController } from './controllers/person.controller';
import { PersonAdminController } from './controllers/person-admin.controller';

/**
 * Person Feature Module.
 * Provides public client and administrative services/controllers for personnel,
 * council members, vice presidents, consultants, inspectors, and provincial officials.
 * Fully decoupled following SOLID principles:
 * - Single Responsibility: Client queries separated from admin mutations
 * - Interface Segregation: Distinct interfaces for client (IPersonService) and admin (IPersonAdminService)
 * - Dependency Inversion: Service providers injected cleanly into controllers
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [PersonController, PersonAdminController],
  providers: [PersonService, PersonAdminService],
  exports: [PersonService, PersonAdminService, MongooseModule],
})
export class PersonModule {}

import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PersonService } from '../services/person.service';
import { PersonRole } from '../person.schema';
import { ListPeopleDto } from '../dtos/list-people.dto';
import { PersonResponseDto } from '../dtos/person-response.dto';

/**
 * Public/Client Person Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles incoming HTTP queries for public users,
 * exposing active personnel, board members, vice presidents, and province officials.
 */
@ApiTags('Person')
@Controller('person')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get()
  @ApiOperation({
    summary:
      'List active personnel with optional role, subRole, province, or search filters',
  })
  @ApiOkResponse({
    type: [PersonResponseDto],
    description: 'Active personnel sorted by hierarchical order.',
  })
  async findAll(@Query() query: ListPeopleDto): Promise<PersonResponseDto[]> {
    const people = await this.personService.findAllActive(query);
    return people as unknown as PersonResponseDto[];
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get active person by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Person MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'The active person details.',
  })
  @ApiNotFoundResponse({ description: 'Person not found or inactive.' })
  async findById(@Param('id') id: string): Promise<PersonResponseDto> {
    const person = await this.personService.findById(id);
    return person as unknown as PersonResponseDto;
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get active personnel by role' })
  @ApiParam({
    name: 'role',
    enum: PersonRole,
    description:
      'Organisational role (e.g. president, vice-president, inspector, consultant)',
    example: PersonRole.CONSULTANT,
  })
  @ApiQuery({
    name: 'subRole',
    required: false,
    description: 'Optional subRole filter',
    example: 'education',
  })
  @ApiOkResponse({
    type: [PersonResponseDto],
    description: 'Active personnel matching the role.',
  })
  async findByRole(
    @Param('role') role: PersonRole,
    @Query('subRole') subRole?: string,
  ): Promise<PersonResponseDto[]> {
    const people = await this.personService.findByRole(role, subRole);
    return people as unknown as PersonResponseDto[];
  }

  @Get('vp/:subRole')
  @ApiOperation({ summary: 'Get active Vice President by sub-role area' })
  @ApiParam({
    name: 'subRole',
    description:
      'Vice President area slug (e.g. education, research, public-relations)',
    example: 'education',
  })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'The active Vice President profile.',
  })
  @ApiNotFoundResponse({ description: 'Vice President not found.' })
  async findVicePresident(
    @Param('subRole') subRole: string,
  ): Promise<PersonResponseDto> {
    const person = await this.personService.findVicePresident(subRole);
    return person as unknown as PersonResponseDto;
  }

  @Get('province/:province')
  @ApiOperation({
    summary: 'Get active officials for a province (by slug or ObjectId)',
  })
  @ApiParam({
    name: 'province',
    description: 'Province slug (e.g. tehran-city) or MongoDB ObjectId',
    example: 'tehran-city',
  })
  @ApiOkResponse({
    type: [PersonResponseDto],
    description: 'Active province branch officials ordered by rank.',
  })
  async findProvinceOfficials(
    @Param('province') province: string,
  ): Promise<PersonResponseDto[]> {
    const people = await this.personService.findProvinceOfficials(province);
    return people as unknown as PersonResponseDto[];
  }
}

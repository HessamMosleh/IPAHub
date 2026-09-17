import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/user.schema';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { PersonAdminService } from '../services/person-admin.service';
import { AdminListPeopleDto } from '../dtos/admin-list-people.dto';
import { CreatePersonDto } from '../dtos/create-person.dto';
import { UpdatePersonDto } from '../dtos/update-person.dto';
import { CreatePersonLicenseDto } from '../dtos/person-license.dto';
import { ReorderPersonDto } from '../dtos/reorder-person.dto';
import {
  PaginatedPeopleResponseDto,
  PersonResponseDto,
} from '../dtos/person-response.dto';

/**
 * Administrative Person Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards.
 */
@ApiTags('Admin - Person')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/person')
export class PersonAdminController {
  constructor(private readonly personAdminService: PersonAdminService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'List personnel with pagination, status, role, and search filters',
  })
  @ApiOkResponse({
    type: PaginatedPeopleResponseDto,
    description: 'Paginated list of personnel.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListPeopleDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedPeopleResponseDto> {
    const result = await this.personAdminService.findAll(query, user);
    return result as unknown as PaginatedPeopleResponseDto;
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get person details by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'Person details.',
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.findById(id, user);
    return person as unknown as PersonResponseDto;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Create a new person record' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'The created person profile.',
  })
  @ApiForbiddenResponse({
    description: 'Outside assigned province scope or role.',
  })
  async create(
    @Body() dto: CreatePersonDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.create(dto, user);
    return person as unknown as PersonResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Update person details' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'The updated person profile.',
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  @ApiForbiddenResponse({
    description: 'Outside assigned province scope or role.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.update(id, dto, user);
    return person as unknown as PersonResponseDto;
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'Toggle person publication status (ACTIVE <-> DISABLED)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'The person profile with updated status.',
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  async toggleStatus(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.toggleStatus(id, user);
    return person as unknown as PersonResponseDto;
  }

  @Patch(':id/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Reorder person moving up or down in listing' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [PersonResponseDto],
    description: 'Updated ordered personnel list.',
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderPersonDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto[]> {
    const people = await this.personAdminService.reorder(id, dto, user);
    return people as unknown as PersonResponseDto[];
  }

  @Post(':id/license')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Add a license/certificate to a person profile' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'Person profile with the added license.',
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  async addLicense(
    @Param('id') id: string,
    @Body() dto: CreatePersonLicenseDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.addLicense(id, dto, user);
    return person as unknown as PersonResponseDto;
  }

  @Delete(':id/license/:licenseId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'Delete a license/certificate from a person profile',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiParam({ name: 'licenseId', example: '66fa3b5a9c1e7a001f3e9a99' })
  @ApiOkResponse({
    type: PersonResponseDto,
    description: 'Person profile with the license removed.',
  })
  @ApiNotFoundResponse({ description: 'Person or license not found.' })
  async deleteLicense(
    @Param('id') id: string,
    @Param('licenseId') licenseId: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PersonResponseDto> {
    const person = await this.personAdminService.deleteLicense(
      id,
      licenseId,
      user,
    );
    return person as unknown as PersonResponseDto;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Disable person (soft delete)' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Person not found.' })
  async delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.personAdminService.delete(id, user);
  }
}

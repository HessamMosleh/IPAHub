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
  ApiConflictResponse,
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
import { ProvinceAdminService } from '../services/province-admin.service';
import { AdminListProvincesDto } from '../dtos/admin-list-provinces.dto';
import { CreateProvinceDto } from '../dtos/create-province.dto';
import { UpdateProvinceDto } from '../dtos/update-province.dto';
import { UpdateProvinceSocialsDto } from '../dtos/update-province-socials.dto';
import { UpdateProvinceContactDto } from '../dtos/update-province-contact.dto';
import { ReorderProvinceDto } from '../dtos/reorder-province.dto';
import {
  PaginatedProvincesResponseDto,
  ProvinceResponseDto,
} from '../dtos/province-response.dto';

/**
 * Administrative Province Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards.
 */
@ApiTags('Admin - Province')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/province')
export class ProvinceAdminController {
  constructor(private readonly provinceAdminService: ProvinceAdminService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'List provinces with pagination, status and search filters',
  })
  @ApiOkResponse({
    type: PaginatedProvincesResponseDto,
    description: 'Paginated list of provinces.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListProvincesDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedProvincesResponseDto> {
    const result = await this.provinceAdminService.findAll(query, user);
    return result as unknown as PaginatedProvincesResponseDto;
  }

  @Post('seed')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Idempotently seed the canonical 32 provinces',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'number', example: 32 },
        total: { type: 'number', example: 32 },
      },
    },
  })
  async seed(): Promise<{ seeded: number; total: number }> {
    return this.provinceAdminService.seed();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get province by id' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'Province details.',
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ProvinceResponseDto> {
    const province = await this.provinceAdminService.findById(id, user);
    return province as unknown as ProvinceResponseDto;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new province' })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The created province.',
  })
  @ApiConflictResponse({ description: 'Province slug already exists.' })
  async create(@Body() dto: CreateProvinceDto): Promise<ProvinceResponseDto> {
    const province = await this.provinceAdminService.create(dto);
    return province as unknown as ProvinceResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update province general information' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The updated province.',
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  @ApiConflictResponse({ description: 'New slug already in use.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceDto,
  ): Promise<ProvinceResponseDto> {
    const province = await this.provinceAdminService.update(id, dto);
    return province as unknown as ProvinceResponseDto;
  }

  @Patch(':id/socials')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Update province social channels (accessible to Super Admin, Admin, and assigned Province Admin)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The province with updated socials.',
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async updateSocials(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceSocialsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ProvinceResponseDto> {
    const province = await this.provinceAdminService.updateSocials(
      id,
      dto,
      user,
    );
    return province as unknown as ProvinceResponseDto;
  }

  @Patch(':id/contact')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Update province contact details (accessible to Super Admin, Admin, and assigned Province Admin)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The province with updated contact details.',
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async updateContact(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceContactDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<ProvinceResponseDto> {
    const province = await this.provinceAdminService.updateContact(
      id,
      dto,
      user,
    );
    return province as unknown as ProvinceResponseDto;
  }

  @Patch(':id/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reorder province moving up or down in listing' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [ProvinceResponseDto],
    description: 'Updated ordered province list.',
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderProvinceDto,
  ): Promise<ProvinceResponseDto[]> {
    const provinces = await this.provinceAdminService.reorder(id, dto);
    return provinces as unknown as ProvinceResponseDto[];
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable province (soft delete)' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Province not found.' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.provinceAdminService.delete(id);
  }
}

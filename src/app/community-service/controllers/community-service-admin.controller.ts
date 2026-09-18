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
import { CommunityServiceAdminService } from '../services/community-service-admin.service';
import { AdminListCommunityServicesDto } from '../dtos/admin-list-community-services.dto';
import { CreateCommunityServiceDto } from '../dtos/create-community-service.dto';
import { UpdateCommunityServiceDto } from '../dtos/update-community-service.dto';
import { ReorderCommunityServiceDto } from '../dtos/reorder-community-service.dto';
import {
  CommunityServiceResponseDto,
  PaginatedCommunityServicesResponseDto,
} from '../dtos/community-service-response.dto';

/**
 * Administrative Community Service Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Community Service')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/community-service')
export class CommunityServiceAdminController {
  constructor(
    private readonly communityServiceAdminService: CommunityServiceAdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List community services with pagination and search filter',
  })
  @ApiOkResponse({
    type: PaginatedCommunityServicesResponseDto,
    description: 'Paginated list of community services.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListCommunityServicesDto,
  ): Promise<PaginatedCommunityServicesResponseDto> {
    const result = await this.communityServiceAdminService.findAll(query);
    return result as unknown as PaginatedCommunityServicesResponseDto;
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Idempotently seed the canonical 4 default community services',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'number', example: 4 },
        total: { type: 'number', example: 4 },
      },
    },
  })
  async seed(): Promise<{ seeded: number; total: number }> {
    return this.communityServiceAdminService.seed();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get community service by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: CommunityServiceResponseDto,
    description: 'Community service details.',
  })
  @ApiNotFoundResponse({ description: 'Community service not found.' })
  async findById(
    @Param('id') id: string,
  ): Promise<CommunityServiceResponseDto> {
    const service = await this.communityServiceAdminService.findById(id);
    return service as unknown as CommunityServiceResponseDto;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new community service' })
  @ApiOkResponse({
    type: CommunityServiceResponseDto,
    description: 'The created community service.',
  })
  async create(
    @Body() dto: CreateCommunityServiceDto,
  ): Promise<CommunityServiceResponseDto> {
    const service = await this.communityServiceAdminService.create(dto);
    return service as unknown as CommunityServiceResponseDto;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update community service properties' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: CommunityServiceResponseDto,
    description: 'The updated community service.',
  })
  @ApiNotFoundResponse({ description: 'Community service not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityServiceDto,
  ): Promise<CommunityServiceResponseDto> {
    const service = await this.communityServiceAdminService.update(id, dto);
    return service as unknown as CommunityServiceResponseDto;
  }

  @Patch(':id/reorder')
  @ApiOperation({
    summary: 'Reorder community service moving up or down in listing',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [CommunityServiceResponseDto],
    description: 'Updated ordered community service list.',
  })
  @ApiNotFoundResponse({ description: 'Community service not found.' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderCommunityServiceDto,
  ): Promise<CommunityServiceResponseDto[]> {
    const services = await this.communityServiceAdminService.reorder(id, dto);
    return services as unknown as CommunityServiceResponseDto[];
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a community service' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Community service not found.' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.communityServiceAdminService.delete(id);
  }
}

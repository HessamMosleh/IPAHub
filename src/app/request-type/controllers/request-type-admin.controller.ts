import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { RequestTypeAdminService } from '../services/request-type-admin.service';
import { AdminListRequestTypesDto } from '../dtos/admin-list-request-types.dto';
import { CreateRequestTypeDto } from '../dtos/create-request-type.dto';
import { UpdateRequestTypeDto } from '../dtos/update-request-type.dto';
import { SetRequestTypeProvincePricesDto } from '../dtos/set-request-type-province-prices.dto';
import { ReorderRequestTypeDto } from '../dtos/reorder-request-type.dto';
import {
  PaginatedRequestTypesResponseDto,
  RequestTypeResponseDto,
} from '../dtos/request-type-response.dto';

/**
 * Administrative Request Type Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards.
 */
@ApiTags('Admin - Request Type')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/request-type')
export class RequestTypeAdminController {
  constructor(
    private readonly requestTypeAdminService: RequestTypeAdminService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'List request types with pagination, status and search filters',
  })
  @ApiOkResponse({
    type: PaginatedRequestTypesResponseDto,
    description: 'Paginated list of request types.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListRequestTypesDto,
  ): Promise<PaginatedRequestTypesResponseDto> {
    const result = await this.requestTypeAdminService.findAll(query);
    return result as unknown as PaginatedRequestTypesResponseDto;
  }

  @Post('seed')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Idempotently seed the canonical 5 request types',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'number', example: 5 },
        total: { type: 'number', example: 5 },
      },
    },
  })
  async seed(): Promise<{ seeded: number; total: number }> {
    return this.requestTypeAdminService.seed();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get request type by id' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'Request type details.',
  })
  @ApiNotFoundResponse({ description: 'Request type not found.' })
  async findById(@Param('id') id: string): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeAdminService.findById(id);
    return type as unknown as RequestTypeResponseDto;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new request type' })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'The created request type.',
  })
  @ApiConflictResponse({ description: 'Request type slug already exists.' })
  async create(
    @Body() dto: CreateRequestTypeDto,
  ): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeAdminService.create(dto);
    return type as unknown as RequestTypeResponseDto;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update request type general information' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'The updated request type.',
  })
  @ApiNotFoundResponse({ description: 'Request type not found.' })
  @ApiConflictResponse({ description: 'New slug already in use.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRequestTypeDto,
  ): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeAdminService.update(id, dto);
    return type as unknown as RequestTypeResponseDto;
  }

  @Put(':id/province-prices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Replace or update per-province price overrides for a request type',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'The request type with updated province price overrides.',
  })
  @ApiNotFoundResponse({
    description: 'Request type or referenced province not found.',
  })
  async setProvincePrices(
    @Param('id') id: string,
    @Body() dto: SetRequestTypeProvincePricesDto,
  ): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeAdminService.setProvincePrices(id, dto);
    return type as unknown as RequestTypeResponseDto;
  }

  @Patch(':id/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reorder request type moving up or down in listing',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [RequestTypeResponseDto],
    description: 'Updated ordered request type list.',
  })
  @ApiNotFoundResponse({ description: 'Request type not found.' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderRequestTypeDto,
  ): Promise<RequestTypeResponseDto[]> {
    const types = await this.requestTypeAdminService.reorder(id, dto);
    return types as unknown as RequestTypeResponseDto[];
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Delete request type (soft-deactivates if referenced in requests, permanently removes if unreferenced)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        softDeleted: { type: 'boolean', example: false },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Request type not found.' })
  async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; softDeleted: boolean }> {
    return this.requestTypeAdminService.delete(id);
  }
}

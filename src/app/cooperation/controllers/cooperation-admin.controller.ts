import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CooperationAdminService } from '../services/cooperation-admin.service';
import { AdminListCooperationRequestsDto } from '../dtos/admin-list-cooperation-requests.dto';
import { DeclineCooperationRequestDto } from '../dtos/decline-cooperation-request.dto';
import {
  CooperationRequestResponseDto,
  PaginatedCooperationRequestsResponseDto,
} from '../dtos/cooperation-request-response.dto';

/**
 * Administrative Cooperation Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Cooperation')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/cooperation')
export class CooperationAdminController {
  constructor(
    private readonly cooperationAdminService: CooperationAdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List cooperation requests with pagination, status, province, and search filters',
  })
  @ApiOkResponse({
    type: PaginatedCooperationRequestsResponseDto,
    description: 'Paginated list of cooperation requests.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListCooperationRequestsDto,
  ): Promise<PaginatedCooperationRequestsResponseDto> {
    const result = await this.cooperationAdminService.findAll(query);
    return result as unknown as PaginatedCooperationRequestsResponseDto;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cooperation request by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: CooperationRequestResponseDto,
    description: 'Cooperation request details with member and province.',
  })
  @ApiNotFoundResponse({ description: 'Cooperation request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findById(
    @Param('id') id: string,
  ): Promise<CooperationRequestResponseDto> {
    const request = await this.cooperationAdminService.findById(id);
    return request as unknown as CooperationRequestResponseDto;
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Accept a pending cooperation proposal',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: CooperationRequestResponseDto,
    description: 'The accepted cooperation proposal.',
  })
  @ApiBadRequestResponse({
    description: 'Request has already been decided (not pending).',
  })
  @ApiNotFoundResponse({ description: 'Cooperation request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async accept(
    @Param('id') id: string,
  ): Promise<CooperationRequestResponseDto> {
    const request = await this.cooperationAdminService.accept(id);
    return request as unknown as CooperationRequestResponseDto;
  }

  @Patch(':id/decline')
  @ApiOperation({
    summary: 'Decline a pending cooperation proposal with a reason',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: CooperationRequestResponseDto,
    description: 'The declined cooperation proposal with reason.',
  })
  @ApiBadRequestResponse({
    description:
      'Request has already been decided or decline reason is missing.',
  })
  @ApiNotFoundResponse({ description: 'Cooperation request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async decline(
    @Param('id') id: string,
    @Body() dto: DeclineCooperationRequestDto,
  ): Promise<CooperationRequestResponseDto> {
    const request = await this.cooperationAdminService.decline(id, dto);
    return request as unknown as CooperationRequestResponseDto;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cooperation request' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Cooperation request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.cooperationAdminService.delete(id);
  }
}

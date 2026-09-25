import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import type { Response } from 'express';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../user.schema';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { StorageService } from '../../../common/storage/storage.service';
import { translate } from '../../../common/utils/translate';
import { UserAdminService } from '../services/user-admin.service';
import { UserService } from '../services/user.service';
import { AdminListUsersDto } from '../dtos/admin-list-users.dto';
import { AdminListAdminsDto } from '../dtos/admin-list-admins.dto';
import { CreateProvinceAdminDto } from '../dtos/create-province-admin.dto';
import { UpdateProvinceAdminDto } from '../dtos/update-province-admin.dto';
import { RejectUserDto } from '../dtos/reject-user.dto';
import { MemberDocumentResponseDto } from '../dtos/member-document-response.dto';
import {
  PaginatedUsersResponseDto,
  UserPendingCountResponseDto,
  UserResponseDto,
} from '../dtos/user-response.dto';
import { MemberDocumentKind } from '../member-document.schema';

/**
 * Administrative User Controller.
 * Segregated from the member self-service controller (SRP).
 * Guarded with JWT and Roles guards.
 *
 * - Member directory (`/admin/user`) is open to province-scoped admins
 *   (results are scoped in the service).
 * - Province-admin CRUD (`/admin/user/admins`) is super/global-admin only.
 */
@ApiTags('Admin - User')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/user')
export class UserAdminController {
  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly userService: UserService,
    private readonly storage: StorageService,
  ) {}

  // --- Members --------------------------------------------------------------

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'List members with pagination, status, province, and search filters',
  })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAllMembers(
    @Query() query: AdminListUsersDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedUsersResponseDto> {
    const result = await this.userAdminService.findAllMembers(query, user);
    return {
      data: result.data.map((u) => this.userService.toResponse(u)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('pending-count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'Count members with registering status awaiting review',
  })
  @ApiOkResponse({ type: UserPendingCountResponseDto })
  async pendingCount(
    @GetUser() user: AuthenticatedUser,
  ): Promise<UserPendingCountResponseDto> {
    return this.userAdminService.countPendingMembers(user);
  }

  // --- Province admins (static paths before :id) ----------------------------

  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List province administrator accounts' })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAllAdmins(
    @Query() query: AdminListAdminsDto,
  ): Promise<PaginatedUsersResponseDto> {
    const result = await this.userAdminService.findAllAdmins(query);
    return {
      data: result.data.map((u) => this.userService.toResponse(u)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Post('admins')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a province administrator account' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'Mobile or national code already exists',
  })
  @ApiBadRequestResponse({ description: 'Invalid managed provinces' })
  async createAdmin(
    @Body() dto: CreateProvinceAdminDto,
  ): Promise<UserResponseDto> {
    const user = await this.userAdminService.createProvinceAdmin(dto);
    return this.userService.toResponse(user);
  }

  @Get('admins/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a province administrator by id' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Administrator not found' })
  async findAdminById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userAdminService.findAdminById(id);
    return this.userService.toResponse(user);
  }

  @Patch('admins/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Update a province administrator (name, provinces, password, active)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Administrator not found' })
  async updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateProvinceAdminDto,
  ): Promise<UserResponseDto> {
    const user = await this.userAdminService.updateProvinceAdmin(id, dto);
    return this.userService.toResponse(user);
  }

  @Delete('admins/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a province administrator' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Administrator not found' })
  async deleteAdmin(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.userAdminService.deleteProvinceAdmin(id);
  }

  // --- Member detail / mutations --------------------------------------------

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get member details by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Member not found' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope' })
  async findMemberById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const member = await this.userAdminService.findMemberById(id, user);
    return this.userService.toResponse(member);
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Approve a member account (assigns membership number; refuses if a bill is outstanding)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({
    description: 'Outstanding membership bill or deleted user',
  })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope' })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async approveMember(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const member = await this.userAdminService.approveMember(id, user);
    return this.userService.toResponse(member);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Reject a registering/rejected member and cancel open membership requests',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Cannot reject an active member' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope' })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async rejectMember(
    @Param('id') id: string,
    @Body() dto: RejectUserDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const member = await this.userAdminService.rejectMember(id, dto, user);
    return this.userService.toResponse(member);
  }

  @Get(':id/documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'List documents uploaded by a member' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: [MemberDocumentResponseDto] })
  @ApiNotFoundResponse({ description: 'Member not found' })
  async listDocuments(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MemberDocumentResponseDto[]> {
    return this.userAdminService.listMemberDocuments(id, user);
  }

  @Get(':id/documents/:kind/download')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Download a member document by kind' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiParam({ name: 'kind', enum: MemberDocumentKind })
  @ApiNotFoundResponse({ description: 'Member or document not found' })
  async downloadDocument(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @GetUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !Object.values(MemberDocumentKind).includes(kind as MemberDocumentKind)
    ) {
      throw new BadRequestException(translate('errors.INVALID_DOCUMENT_KIND'));
    }
    const doc = await this.userAdminService.getMemberDocument(id, kind, user);
    const { stream, mimeType, size } = await this.storage.getObject(
      doc.file.key,
    );
    if (mimeType || doc.file.mimeType) {
      res.setHeader('Content-Type', mimeType || doc.file.mimeType!);
    }
    if (size != null) res.setHeader('Content-Length', size);
    if (doc.file.originalName) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${doc.file.originalName}"`,
      );
    }
    stream.pipe(res);
  }
}

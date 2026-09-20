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
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { DocumentRequestAdminService } from '../services/document-request-admin.service';
import { AdminListDocumentRequestsDto } from '../dtos/admin-list-document-requests.dto';
import { RejectDocumentRequestDto } from '../dtos/reject-document-request.dto';
import { FulfillDocumentRequestDto } from '../dtos/fulfill-document-request.dto';
import { MarkPaidDocumentRequestDto } from '../dtos/mark-paid-document-request.dto';
import {
  DocumentRequestResponseDto,
  PaginatedDocumentRequestsResponseDto,
} from '../dtos/document-request-response.dto';

/**
 * Administrative Document Request Controller.
 * Segregated from the member client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN, ADMIN, PROVINCE_ADMIN).
 */
@ApiTags('Admin - Document Request')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
@Controller('admin/document-request')
export class DocumentRequestAdminController {
  constructor(
    private readonly documentRequestAdminService: DocumentRequestAdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List document requests with pagination, status, requestType, province, search, and attention filters',
  })
  @ApiOkResponse({
    type: PaginatedDocumentRequestsResponseDto,
    description: 'Paginated list of document requests.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListDocumentRequestsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedDocumentRequestsResponseDto> {
    const result = await this.documentRequestAdminService.findAll(query, user);
    return result as unknown as PaginatedDocumentRequestsResponseDto;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document request by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'Document request details with user and request type.',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestAdminService.findById(id, user);
    return request as unknown as DocumentRequestResponseDto;
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary:
      'Accept a pending document request (moves to ACCEPTED; sets paymentStatus to PENDING if fee > 0 or NONE)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'The accepted document request.',
  })
  @ApiBadRequestResponse({
    description: 'Request has already been decided (not pending).',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async accept(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestAdminService.accept(id, user);
    return request as unknown as DocumentRequestResponseDto;
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Reject a pending document request with an optional reason',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'The rejected document request.',
  })
  @ApiBadRequestResponse({
    description: 'Request has already been decided (not pending).',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectDocumentRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestAdminService.reject(
      id,
      dto,
      user,
    );
    return request as unknown as DocumentRequestResponseDto;
  }

  @Patch(':id/fulfill')
  @ApiOperation({
    summary:
      'Fulfill an accepted document request by uploading/attaching the issued file (completed)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'The fulfilled document request.',
  })
  @ApiBadRequestResponse({
    description:
      'Request is not accepted, is awaiting payment, or missing file for document-producing type.',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async fulfill(
    @Param('id') id: string,
    @Body() dto: FulfillDocumentRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestAdminService.fulfill(
      id,
      dto,
      user,
    );
    return request as unknown as DocumentRequestResponseDto;
  }

  @Patch(':id/mark-paid')
  @ApiOperation({
    summary:
      'Confirm an offline payment (cash, bank transfer, receipt) for an accepted document request bill and record ledger payment',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'The paid document request.',
  })
  @ApiBadRequestResponse({
    description:
      'Request is not accepted, not awaiting payment, or already paid.',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDocumentRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestAdminService.markPaid(
      id,
      dto,
      user,
    );
    return request as unknown as DocumentRequestResponseDto;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document request' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async delete(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.documentRequestAdminService.delete(id, user);
  }
}

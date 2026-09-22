import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { DocumentRequestService } from '../services/document-request.service';
import { CreateDocumentRequestDto } from '../dtos/create-document-request.dto';
import { ListDocumentRequestsDto } from '../dtos/list-document-requests.dto';
import { DocumentRequestOptionsResponseDto } from '../dtos/document-request-options-response.dto';
import {
  DocumentRequestResponseDto,
  PaginatedDocumentRequestsResponseDto,
} from '../dtos/document-request-response.dto';
import { MembershipCardResponseDto } from '../../membership/dtos/membership-card-response.dto';

/**
 * Public/Member Client Document Request Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles member self-service:
 * exploring available document types with live quotes, submitting requests,
 * and reviewing personal request status. Contains no admin capabilities.
 */
@ApiTags('Document Request')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('document-request')
export class DocumentRequestController {
  constructor(
    private readonly documentRequestService: DocumentRequestService,
  ) {}

  @Get('options')
  @ApiOperation({
    summary:
      'List available document request types with member-specific pricing and card eligibility status',
  })
  @ApiOkResponse({
    type: DocumentRequestOptionsResponseDto,
    description:
      'Available document request types with live quotes and blocker states.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getOptions(
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestOptionsResponseDto> {
    return this.documentRequestService.getOptions(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Submit a new document request as an active member',
  })
  @ApiCreatedResponse({
    type: DocumentRequestResponseDto,
    description: 'The created document request receipt (PENDING review).',
  })
  @ApiBadRequestResponse({
    description:
      'Request type inactive, or member profile incomplete for a membership card.',
  })
  @ApiForbiddenResponse({
    description: 'Membership is not active.',
  })
  @ApiNotFoundResponse({ description: 'User or request type not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateDocumentRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestService.create(dto, user.id);
    return request as unknown as DocumentRequestResponseDto;
  }

  @Get()
  @ApiOperation({
    summary: "List current authenticated member's submitted document requests",
  })
  @ApiOkResponse({
    type: PaginatedDocumentRequestsResponseDto,
    description: 'Paginated list of submitted document requests.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query() query: ListDocumentRequestsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedDocumentRequestsResponseDto> {
    const result = await this.documentRequestService.findAllByUser(
      user.id,
      query,
    );
    return result as unknown as PaginatedDocumentRequestsResponseDto;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific submitted document request',
  })
  @ApiParam({
    name: 'id',
    description: 'Document request MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: DocumentRequestResponseDto,
    description: 'The document request details.',
  })
  @ApiNotFoundResponse({ description: 'Document request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<DocumentRequestResponseDto> {
    const request = await this.documentRequestService.findByIdAndUser(
      id,
      user.id,
    );
    return request as unknown as DocumentRequestResponseDto;
  }

  @Get(':id/card')
  @ApiOperation({
    summary: 'Get the issued membership card for a submitted document request',
  })
  @ApiParam({
    name: 'id',
    description: 'Document request MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: MembershipCardResponseDto,
    description: 'The issued membership card details.',
  })
  @ApiNotFoundResponse({
    description: 'Document request or membership card not found.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getCard(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipCardResponseDto> {
    const card = await this.documentRequestService.getCard(id, user.id);
    return card as unknown as MembershipCardResponseDto;
  }
}

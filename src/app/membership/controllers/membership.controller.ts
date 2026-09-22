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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { MembershipService } from '../services/membership.service';
import { MembershipCardService } from '../services/membership-card.service';
import { SubmitMembershipRequestDto } from '../dtos/submit-membership-request.dto';
import { ListMembershipRequestsDto } from '../dtos/list-membership-requests.dto';
import { MembershipOptionsResponseDto } from '../dtos/membership-option-response.dto';
import {
  MembershipRequestResponseDto,
  PaginatedMembershipRequestsResponseDto,
} from '../dtos/membership-request-response.dto';
import { MembershipCardResponseDto } from '../dtos/membership-card-response.dto';
import { NotFoundException } from '@nestjs/common';
import { translate } from '../../../common/utils/translate';

/**
 * Public/Member Client Membership Controller.
 * Adheres to SRP — handles member self-service: viewing tiers with live quotes,
 * applying, renewing, and reviewing their own requests. No admin capabilities.
 */
@ApiTags('Membership')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('membership')
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly membershipCardService: MembershipCardService,
  ) {}

  @Get('options')
  @ApiOperation({
    summary:
      'List applicable membership tiers with their copy and a live cost quote for the current member',
  })
  @ApiOkResponse({ type: MembershipOptionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getOptions(
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipOptionsResponseDto> {
    return this.membershipService.getOptions(user.id);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Submit a membership application or tier change' })
  @ApiCreatedResponse({
    type: MembershipRequestResponseDto,
    description: 'The created membership request (PENDING admin review).',
  })
  @ApiBadRequestResponse({
    description:
      'Profile incomplete, required document missing, invalid form, or non-applicable tier.',
  })
  @ApiConflictResponse({
    description: 'Same tier already held, or an open request already exists.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async apply(
    @Body() dto: SubmitMembershipRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipService.apply(dto, user.id);
    return request as unknown as MembershipRequestResponseDto;
  }

  @Post('renew')
  @ApiOperation({
    summary: 'Self-serve renewal of the current membership tier',
  })
  @ApiCreatedResponse({
    type: MembershipRequestResponseDto,
    description:
      'The renewal request (AWAITING_PAYMENT, or APPROVED when the fee is zero).',
  })
  @ApiBadRequestResponse({ description: 'No tier to renew.' })
  @ApiConflictResponse({ description: 'An open request already exists.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async renew(
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipService.renew(user.id);
    return request as unknown as MembershipRequestResponseDto;
  }

  @Get('requests')
  @ApiOperation({ summary: "List the current member's membership requests" })
  @ApiOkResponse({ type: PaginatedMembershipRequestsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query() query: ListMembershipRequestsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedMembershipRequestsResponseDto> {
    const result = await this.membershipService.findAllByUser(user.id, query);
    return result as unknown as PaginatedMembershipRequestsResponseDto;
  }

  @Get('requests/:id')
  @ApiOperation({ summary: "Get one of the member's own membership requests" })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipService.findByIdAndUser(id, user.id);
    return request as unknown as MembershipRequestResponseDto;
  }

  // --- Membership Cards -----------------------------------------------------

  @Get('card')
  @ApiOperation({
    summary: "Get current authenticated member's latest issued membership card",
  })
  @ApiOkResponse({ type: MembershipCardResponseDto })
  @ApiNotFoundResponse({ description: 'No issued membership card found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMyCard(
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipCardResponseDto> {
    const card = await this.membershipCardService.findLatestByUserId(user.id);
    if (!card) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }
    return card as unknown as MembershipCardResponseDto;
  }

  @Get('cards')
  @ApiOperation({
    summary:
      'List all issued membership cards for current authenticated member',
  })
  @ApiOkResponse({ type: [MembershipCardResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMyCards(
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipCardResponseDto[]> {
    const cards = await this.membershipCardService.findByUserId(user.id);
    return cards as unknown as MembershipCardResponseDto[];
  }

  @Get('cards/:id')
  @ApiOperation({
    summary: "Get one of the authenticated member's own membership cards by ID",
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipCardResponseDto })
  @ApiNotFoundResponse({ description: 'Membership card not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findCardById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipCardResponseDto> {
    const card = await this.membershipCardService.findByIdForUser(id, user.id);
    if (!card) {
      throw new NotFoundException(
        translate('errors.DOCUMENT_REQUEST_NOT_FOUND'),
      );
    }
    return card as unknown as MembershipCardResponseDto;
  }
}

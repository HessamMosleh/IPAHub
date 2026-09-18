import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
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
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { MembershipAdminService } from '../services/membership-admin.service';
import { AdminListMembershipRequestsDto } from '../dtos/admin-list-membership-requests.dto';
import { RejectMembershipRequestDto } from '../dtos/reject-membership-request.dto';
import { MarkPaidMembershipRequestDto } from '../dtos/mark-paid-membership-request.dto';
import { UpdateMembershipFeeDto } from '../dtos/update-membership-fee.dto';
import { SetProvincePricesDto } from '../dtos/set-province-prices.dto';
import { UpdateMembershipTypeInfoDto } from '../dtos/update-membership-type-info.dto';
import {
  MembershipRequestResponseDto,
  PaginatedMembershipRequestsResponseDto,
} from '../dtos/membership-request-response.dto';
import { MembershipFeeResponseDto } from '../dtos/membership-fee-response.dto';
import { MembershipTypeInfoResponseDto } from '../dtos/membership-type-info-response.dto';

/**
 * Administrative Membership Controller.
 * Segregated from the member client controller (SRP). Guarded with JWT and Roles
 * guards. Request review is open to province-scoped admins (results are scoped in
 * the service); fee and tier-copy configuration is restricted to global admins.
 */
@ApiTags('Admin - Membership')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin/membership')
export class MembershipAdminController {
  constructor(
    private readonly membershipAdminService: MembershipAdminService,
  ) {}

  // --- Requests -------------------------------------------------------------

  @Get('requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'List membership requests with pagination, status, kind, type, province, and search filters',
  })
  @ApiOkResponse({ type: PaginatedMembershipRequestsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAllRequests(
    @Query() query: AdminListMembershipRequestsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedMembershipRequestsResponseDto> {
    const result = await this.membershipAdminService.findAllRequests(
      query,
      user,
    );
    return result as unknown as PaginatedMembershipRequestsResponseDto;
  }

  @Post('seed')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Idempotently seed a fee row and info row for every membership tier',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        fees: { type: 'number', example: 4 },
        typeInfos: { type: 'number', example: 4 },
      },
    },
  })
  async seed(): Promise<{ fees: number; typeInfos: number }> {
    return this.membershipAdminService.seed();
  }

  // --- Fees -----------------------------------------------------------------

  @Get('fees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: "List every tier's fee configuration" })
  @ApiOkResponse({ type: [MembershipFeeResponseDto] })
  async findAllFees(): Promise<MembershipFeeResponseDto[]> {
    const fees = await this.membershipAdminService.findAllFees();
    return fees as unknown as MembershipFeeResponseDto[];
  }

  @Patch('fees/:type')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Set a tier's national base and entrance fees" })
  @ApiParam({ name: 'type', enum: MembershipType })
  @ApiOkResponse({ type: MembershipFeeResponseDto })
  async updateFee(
    @Param('type', new ParseEnumPipe(MembershipType)) type: MembershipType,
    @Body() dto: UpdateMembershipFeeDto,
  ): Promise<MembershipFeeResponseDto> {
    const fee = await this.membershipAdminService.updateFee(type, dto);
    return fee as unknown as MembershipFeeResponseDto;
  }

  @Put('fees/:type/province-prices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Replace a tier's per-province fee overrides" })
  @ApiParam({ name: 'type', enum: MembershipType })
  @ApiOkResponse({ type: MembershipFeeResponseDto })
  async setProvincePrices(
    @Param('type', new ParseEnumPipe(MembershipType)) type: MembershipType,
    @Body() dto: SetProvincePricesDto,
  ): Promise<MembershipFeeResponseDto> {
    const fee = await this.membershipAdminService.setProvincePrices(type, dto);
    return fee as unknown as MembershipFeeResponseDto;
  }

  // --- Tier copy ------------------------------------------------------------

  @Get('types')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: "List every tier's member-facing copy" })
  @ApiOkResponse({ type: [MembershipTypeInfoResponseDto] })
  async findAllTypeInfo(): Promise<MembershipTypeInfoResponseDto[]> {
    const infos = await this.membershipAdminService.findAllTypeInfo();
    return infos as unknown as MembershipTypeInfoResponseDto[];
  }

  @Put('types/:type')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Upsert a tier's summary and rights copy" })
  @ApiParam({ name: 'type', enum: MembershipType })
  @ApiOkResponse({ type: MembershipTypeInfoResponseDto })
  @ApiBadRequestResponse({ description: 'English summary is required.' })
  async saveTypeInfo(
    @Param('type', new ParseEnumPipe(MembershipType)) type: MembershipType,
    @Body() dto: UpdateMembershipTypeInfoDto,
  ): Promise<MembershipTypeInfoResponseDto> {
    const info = await this.membershipAdminService.saveTypeInfo(type, dto);
    return info as unknown as MembershipTypeInfoResponseDto;
  }

  // --- Request decisions (declared after fixed paths) -----------------------

  @Get('requests/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({ summary: 'Get a membership request by id' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipRequestResponseDto })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async findRequestById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipAdminService.findRequestById(id, user);
    return request as unknown as MembershipRequestResponseDto;
  }

  @Post('requests/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Approve a pending application: quote, snapshot the bill, and bill or activate',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Request is not pending.' })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async approve(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipAdminService.approve(id, user);
    return request as unknown as MembershipRequestResponseDto;
  }

  @Post('requests/:id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary: 'Reject a pending application with an optional reason',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Request is not pending.' })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectMembershipRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipAdminService.reject(id, dto, user);
    return request as unknown as MembershipRequestResponseDto;
  }

  @Post('requests/:id/mark-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVINCE_ADMIN)
  @ApiOperation({
    summary:
      'Confirm an offline payment for an awaiting-payment request and activate the membership',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({ type: MembershipRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Request is not awaiting payment.' })
  @ApiNotFoundResponse({ description: 'Membership request not found.' })
  @ApiForbiddenResponse({ description: 'Outside assigned province scope.' })
  async markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidMembershipRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<MembershipRequestResponseDto> {
    const request = await this.membershipAdminService.markPaid(id, dto, user);
    return request as unknown as MembershipRequestResponseDto;
  }
}

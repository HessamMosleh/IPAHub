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
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CooperationService } from '../services/cooperation.service';
import { CreateCooperationRequestDto } from '../dtos/create-cooperation-request.dto';
import { ListCooperationRequestsDto } from '../dtos/list-cooperation-requests.dto';
import {
  CooperationRequestResponseDto,
  PaginatedCooperationRequestsResponseDto,
} from '../dtos/cooperation-request-response.dto';

/**
 * Public/Member Client Cooperation Controller.
 * Adheres to SRP — handles member actions:
 * submitting cooperation proposals and reviewing personal requests.
 */
@ApiTags('Cooperation')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('cooperation')
export class CooperationController {
  constructor(private readonly cooperationService: CooperationService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a cooperation proposal as an active member',
  })
  @ApiCreatedResponse({
    type: CooperationRequestResponseDto,
    description: 'The created cooperation proposal receipt.',
  })
  @ApiConflictResponse({
    description: 'A pending cooperation request already exists.',
  })
  @ApiForbiddenResponse({
    description: 'Membership is not active or has lapsed beyond grace period.',
  })
  @ApiNotFoundResponse({ description: 'User or province not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateCooperationRequestDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<CooperationRequestResponseDto> {
    const request = await this.cooperationService.create(dto, user.id);
    return request as unknown as CooperationRequestResponseDto;
  }

  @Get()
  @ApiOperation({
    summary: "List current authenticated member's cooperation requests",
  })
  @ApiOkResponse({
    type: PaginatedCooperationRequestsResponseDto,
    description: 'List of submitted cooperation requests.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query() query: ListCooperationRequestsDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedCooperationRequestsResponseDto> {
    const result = await this.cooperationService.findAllByUser(user.id, query);
    return result as unknown as PaginatedCooperationRequestsResponseDto;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific submitted cooperation request',
  })
  @ApiParam({
    name: 'id',
    description: 'Cooperation request MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: CooperationRequestResponseDto,
    description: 'The cooperation request details.',
  })
  @ApiNotFoundResponse({ description: 'Cooperation request not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<CooperationRequestResponseDto> {
    const request = await this.cooperationService.findByIdAndUser(id, user.id);
    return request as unknown as CooperationRequestResponseDto;
  }
}

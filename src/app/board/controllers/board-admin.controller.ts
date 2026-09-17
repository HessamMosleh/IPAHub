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
import { BoardAdminService } from '../services/board-admin.service';
import { AddBoardMemberDto } from '../dtos/add-board-member.dto';
import { AdminListBoardTermsDto } from '../dtos/admin-list-board-terms.dto';
import { CreateBoardTermDto } from '../dtos/create-board-term.dto';
import { ReorderBoardMemberDto } from '../dtos/reorder-board-member.dto';
import { UpdateBoardMemberDto } from '../dtos/update-board-member.dto';
import { UpdateBoardTermDto } from '../dtos/update-board-term.dto';
import {
  BoardTermResponseDto,
  PaginatedBoardTermsResponseDto,
} from '../dtos/board-term-response.dto';
import { PersonResponseDto } from '../../person/dtos/person-response.dto';

/**
 * Administrative Board Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Board')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/board')
export class BoardAdminController {
  constructor(private readonly boardAdminService: BoardAdminService) {}

  @Get('terms')
  @ApiOperation({
    summary: 'List board terms with pagination and search filter',
  })
  @ApiOkResponse({
    type: PaginatedBoardTermsResponseDto,
    description: 'Paginated list of board terms.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListBoardTermsDto,
  ): Promise<PaginatedBoardTermsResponseDto> {
    const result = await this.boardAdminService.findAll(query);
    return result as unknown as PaginatedBoardTermsResponseDto;
  }

  @Get('terms/:id')
  @ApiOperation({
    summary: 'Get board term details with populated members by ID',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'Board term details.',
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  async findById(@Param('id') id: string): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.findById(id);
    return term as unknown as BoardTermResponseDto;
  }

  @Get('terms/:id/eligible-people')
  @ApiOperation({
    summary:
      'List personnel with role = BOARD who are not yet added to this term',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: [PersonResponseDto],
    description: 'List of eligible board personnel for the term picker.',
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  async getEligiblePeople(
    @Param('id') id: string,
  ): Promise<PersonResponseDto[]> {
    const people = await this.boardAdminService.getEligiblePeople(id);
    return people as unknown as PersonResponseDto[];
  }

  @Post('terms')
  @ApiOperation({ summary: 'Create a new board term' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'The created board term.',
  })
  @ApiConflictResponse({
    description: 'Order already exists or dates overlap with another term.',
  })
  async create(@Body() dto: CreateBoardTermDto): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.create(dto);
    return term as unknown as BoardTermResponseDto;
  }

  @Patch('terms/:id')
  @ApiOperation({ summary: 'Update board term general details' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'The updated board term.',
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  @ApiConflictResponse({
    description: 'Order already exists or dates overlap with another term.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBoardTermDto,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.update(id, dto);
    return term as unknown as BoardTermResponseDto;
  }

  @Delete('terms/:id')
  @ApiOperation({ summary: 'Delete a board term' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.boardAdminService.delete(id);
  }

  @Post('terms/:id/members')
  @ApiOperation({ summary: 'Add a member to a board term' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'Board term with the added member.',
  })
  @ApiNotFoundResponse({
    description: 'Board term or Person not found.',
  })
  @ApiConflictResponse({
    description:
      'Person already in this term or singleton position already occupied.',
  })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddBoardMemberDto,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.addMember(id, dto);
    return term as unknown as BoardTermResponseDto;
  }

  @Patch('terms/:id/members/:memberId')
  @ApiOperation({ summary: 'Update position or order of a board member' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiParam({ name: 'memberId', example: '66fa3b5a9c1e7a001f3e9a22' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'Board term with the updated member.',
  })
  @ApiNotFoundResponse({
    description: 'Board term or member not found.',
  })
  @ApiConflictResponse({
    description: 'Singleton position already occupied by another member.',
  })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateBoardMemberDto,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.updateMember(id, memberId, dto);
    return term as unknown as BoardTermResponseDto;
  }

  @Delete('terms/:id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from a board term' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiParam({ name: 'memberId', example: '66fa3b5a9c1e7a001f3e9a22' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'Board term with the member removed.',
  })
  @ApiNotFoundResponse({
    description: 'Board term or member not found.',
  })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.removeMember(id, memberId);
    return term as unknown as BoardTermResponseDto;
  }

  @Patch('terms/:id/members/:memberId/reorder')
  @ApiOperation({
    summary: 'Reorder a member moving up or down within their position group',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiParam({ name: 'memberId', example: '66fa3b5a9c1e7a001f3e9a22' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'Board term with the reordered members.',
  })
  @ApiNotFoundResponse({
    description: 'Board term or member not found.',
  })
  async reorderMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: ReorderBoardMemberDto,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardAdminService.reorderMember(id, memberId, dto);
    return term as unknown as BoardTermResponseDto;
  }
}

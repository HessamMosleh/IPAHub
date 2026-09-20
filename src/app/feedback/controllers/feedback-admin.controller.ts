import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { FeedbackAdminService } from '../services/feedback-admin.service';
import { AdminListFeedbackDto } from '../dtos/admin-list-feedback.dto';
import {
  FeedbackPendingCountResponseDto,
  FeedbackResponseDto,
  PaginatedFeedbackResponseDto,
} from '../dtos/feedback-response.dto';

/**
 * Administrative Feedback Controller.
 * Segregated from the member client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Feedback')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/feedback')
export class FeedbackAdminController {
  constructor(private readonly feedbackAdminService: FeedbackAdminService) {}

  @Get()
  @ApiOperation({
    summary:
      'List member feedback messages with pagination, resolved filter, and search',
  })
  @ApiOkResponse({
    type: PaginatedFeedbackResponseDto,
    description: 'Paginated list of member feedback messages.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: AdminListFeedbackDto,
  ): Promise<PaginatedFeedbackResponseDto> {
    const result = await this.feedbackAdminService.findAll(query);
    return result as unknown as PaginatedFeedbackResponseDto;
  }

  @Get('pending-count')
  @ApiOperation({
    summary: 'Get count of unresolved (open) feedback messages',
  })
  @ApiOkResponse({
    type: FeedbackPendingCountResponseDto,
    description: 'Count of unresolved feedback messages.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getPendingCount(): Promise<FeedbackPendingCountResponseDto> {
    return this.feedbackAdminService.countUnresolved();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member feedback by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: FeedbackResponseDto,
    description: 'Feedback details with sender member populated.',
  })
  @ApiNotFoundResponse({ description: 'Feedback not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findById(@Param('id') id: string): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackAdminService.findById(id);
    return feedback as unknown as FeedbackResponseDto;
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark member feedback as resolved' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: FeedbackResponseDto,
    description: 'The resolved feedback message.',
  })
  @ApiNotFoundResponse({ description: 'Feedback not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async resolve(@Param('id') id: string): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackAdminService.resolve(id);
    return feedback as unknown as FeedbackResponseDto;
  }

  @Patch(':id/unresolve')
  @ApiOperation({
    summary: 'Reopen member feedback (mark as unresolved)',
  })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: FeedbackResponseDto,
    description: 'The reopened feedback message.',
  })
  @ApiNotFoundResponse({ description: 'Feedback not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async unresolve(@Param('id') id: string): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackAdminService.unresolve(id);
    return feedback as unknown as FeedbackResponseDto;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete member feedback by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiNotFoundResponse({ description: 'Feedback not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.feedbackAdminService.delete(id);
  }
}

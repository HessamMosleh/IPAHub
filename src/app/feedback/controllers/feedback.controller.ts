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
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dtos/create-feedback.dto';
import { ListFeedbackDto } from '../dtos/list-feedback.dto';
import {
  FeedbackResponseDto,
  PaginatedFeedbackResponseDto,
} from '../dtos/feedback-response.dto';

/**
 * Public/Member Client Feedback Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles member self-service:
 * submitting feedback messages to the association and reviewing past personal submissions.
 * Contains no administrative capabilities.
 */
@ApiTags('Feedback')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a feedback message as an active member',
  })
  @ApiCreatedResponse({
    type: FeedbackResponseDto,
    description: 'The created feedback message receipt.',
  })
  @ApiForbiddenResponse({
    description: 'Membership is not active.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateFeedbackDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackService.create(dto, user.id);
    return feedback as unknown as FeedbackResponseDto;
  }

  @Get()
  @ApiOperation({
    summary: "List current authenticated member's submitted feedback messages",
  })
  @ApiOkResponse({
    type: PaginatedFeedbackResponseDto,
    description: 'Paginated list of submitted feedback messages.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query() query: ListFeedbackDto,
    @GetUser() user: AuthenticatedUser,
  ): Promise<PaginatedFeedbackResponseDto> {
    const result = await this.feedbackService.findAllByUser(user.id, query);
    return result as unknown as PaginatedFeedbackResponseDto;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific submitted feedback message',
  })
  @ApiParam({
    name: 'id',
    description: 'Feedback MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: FeedbackResponseDto,
    description: 'The feedback message details.',
  })
  @ApiNotFoundResponse({ description: 'Feedback not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findById(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
  ): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackService.findByIdAndUser(id, user.id);
    return feedback as unknown as FeedbackResponseDto;
  }
}

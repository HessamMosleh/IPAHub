import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BoardService } from '../services/board.service';
import { ListBoardTermsDto } from '../dtos/list-board-terms.dto';
import {
  BoardServiceItemResponseDto,
  BoardStandingResponseDto,
  BoardTermResponseDto,
  PublicBoardViewResponseDto,
} from '../dtos/board-term-response.dto';

/**
 * Public/Client Board Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles incoming HTTP queries for public users,
 * exposing the composite board view, term history, and person board service records.
 */
@ApiTags('Board')
@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get composite public board view (selected/current term with members, switcher terms list, and legacy fallback)',
  })
  @ApiOkResponse({
    type: PublicBoardViewResponseDto,
    description: 'Full public board view with resolved term selection.',
  })
  async getBoardView(
    @Query() query: ListBoardTermsDto,
  ): Promise<PublicBoardViewResponseDto> {
    const view = await this.boardService.getBoardView(query.term);
    return view as unknown as PublicBoardViewResponseDto;
  }

  @Get('terms')
  @ApiOperation({
    summary: 'List all board terms sorted newest first (order desc)',
  })
  @ApiOkResponse({
    type: [BoardTermResponseDto],
    description: 'All board terms with populated members.',
  })
  async findAllTerms(
    @Query() query: ListBoardTermsDto,
  ): Promise<BoardTermResponseDto[]> {
    const terms = await this.boardService.findAllTerms(query);
    return terms as unknown as BoardTermResponseDto[];
  }

  @Get('terms/current')
  @ApiOperation({ summary: 'Get current sitting board term' })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'The current active board term or null if none exist.',
  })
  async findCurrentTerm(): Promise<BoardTermResponseDto | null> {
    const term = await this.boardService.findCurrentTerm();
    return term as unknown as BoardTermResponseDto | null;
  }

  @Get('terms/:order')
  @ApiOperation({ summary: 'Get board term by sequence order number' })
  @ApiParam({
    name: 'order',
    description: 'Board term sequence number (e.g. 1, 2, 3)',
    example: 3,
  })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'The requested board term details.',
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  async findByOrder(
    @Param('order') order: string,
  ): Promise<BoardTermResponseDto> {
    const term = await this.boardService.findByOrder(Number(order));
    return term as unknown as BoardTermResponseDto;
  }

  @Get('term-id/:id')
  @ApiOperation({ summary: 'Get board term by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Board term MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: BoardTermResponseDto,
    description: 'The requested board term details.',
  })
  @ApiNotFoundResponse({ description: 'Board term not found.' })
  async findById(@Param('id') id: string): Promise<BoardTermResponseDto> {
    const term = await this.boardService.findById(id);
    return term as unknown as BoardTermResponseDto;
  }

  @Get('person/:personId/service')
  @ApiOperation({
    summary: 'Get board service history for a person (for public profile page)',
  })
  @ApiParam({
    name: 'personId',
    description: 'Person MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: [BoardServiceItemResponseDto],
    description:
      'List of all board terms and positions this person has served.',
  })
  async getBoardServiceForPerson(
    @Param('personId') personId: string,
  ): Promise<BoardServiceItemResponseDto[]> {
    const serviceList =
      await this.boardService.getBoardServiceForPerson(personId);
    return serviceList;
  }

  @Get('standing')
  @ApiOperation({
    summary:
      'Get overall board standing (current seat holders and former members)',
  })
  @ApiOkResponse({
    type: BoardStandingResponseDto,
    description: 'Board standing map for current and former members.',
  })
  async getBoardStanding(): Promise<BoardStandingResponseDto> {
    const standing = await this.boardService.getBoardStanding();
    return standing;
  }
}

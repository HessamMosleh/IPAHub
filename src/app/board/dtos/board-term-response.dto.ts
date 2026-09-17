import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { PersonResponseDto } from '../../person/dtos/person-response.dto';
import { BoardPosition } from '../board-term.schema';

export class BoardMembershipResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a22' })
  _id: string;

  @ApiProperty({
    type: () => PersonResponseDto,
    description: 'Populated person profile details',
  })
  person: PersonResponseDto;

  @ApiProperty({ enum: BoardPosition, example: BoardPosition.CHAIRMAN })
  position: BoardPosition;

  @ApiProperty({ example: 0, description: 'Sort order within position group' })
  order: number;
}

export class BoardTermResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiProperty({ example: 3, description: 'Term sequence number' })
  order: number;

  @ApiProperty({ example: '2023-06-21T00:00:00.000Z' })
  startsAt: Date;

  @ApiPropertyOptional({
    example: '2026-06-21T00:00:00.000Z',
    nullable: true,
  })
  endsAt?: Date | null;

  @ApiProperty({
    type: [BoardMembershipResponseDto],
    description: 'Members serving in this board term, sorted by hierarchy',
  })
  members: BoardMembershipResponseDto[];

  @ApiPropertyOptional({ example: 7, description: 'Total number of members' })
  memberCount?: number;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class BoardTermSummaryDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 3 })
  order: number;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiProperty({ example: '2023-06-21T00:00:00.000Z' })
  startsAt: Date;

  @ApiPropertyOptional({
    example: '2026-06-21T00:00:00.000Z',
    nullable: true,
  })
  endsAt?: Date | null;

  @ApiProperty({ example: 7 })
  memberCount: number;

  @ApiProperty({
    example: true,
    description: 'Whether this term is the active current sitting term',
  })
  isCurrent: boolean;
}

export class PaginatedBoardTermsResponseDto {
  @ApiProperty({ type: [BoardTermResponseDto] })
  data: BoardTermResponseDto[];

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class BoardServiceItemResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  termId: string;

  @ApiProperty({ example: 3 })
  termOrder: number;

  @ApiProperty({ type: LocalizedTextDto })
  termName: LocalizedTextDto;

  @ApiProperty({ enum: BoardPosition, example: BoardPosition.CHAIRMAN })
  position: BoardPosition;
}

export class BoardStandingResponseDto {
  @ApiProperty({
    description: 'Map of personId to position slug held in the current term',
    example: { '66fa3b5a9c1e7a001f3e9a11': 'chairman' },
  })
  current: Record<string, string>;

  @ApiProperty({
    description:
      'List of personIds who served in past terms but hold no seat in the current term',
    example: ['66fa3b5a9c1e7a001f3e9a99'],
  })
  former: string[];
}

export class PublicBoardViewResponseDto {
  @ApiPropertyOptional({
    type: BoardTermResponseDto,
    description: 'The selected or default current board term',
  })
  selectedTerm?: BoardTermResponseDto;

  @ApiProperty({
    type: [BoardTermSummaryDto],
    description: 'All board terms for the switcher component',
  })
  terms: BoardTermSummaryDto[];

  @ApiProperty({
    type: [BoardMembershipResponseDto],
    description: 'Members for the selected term (or legacy members)',
  })
  members: BoardMembershipResponseDto[];

  @ApiProperty({
    example: false,
    description: 'True if falling back to legacy pre-terms board members',
  })
  isLegacy: boolean;
}

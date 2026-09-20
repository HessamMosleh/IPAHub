import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { CardBlocker } from '../utils/card-eligibility.util';

export class DocumentRequestOptionDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  id: string;

  @ApiProperty({ example: 'membership-card' })
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  description?: LocalizedTextDto;

  @ApiProperty({
    description: 'Applicable fee for the requesting member in Rials',
    example: 500000,
  })
  fee: number;

  @ApiProperty({
    description: 'Whether fulfilling this request hands the member a file',
    example: true,
  })
  producesDocument: boolean;

  @ApiProperty({
    description: 'Whether this request type is disabled for the current member',
    example: false,
  })
  disabled: boolean;

  @ApiPropertyOptional({
    description: 'Missing profile fields or requirements blocking this option',
    example: ['photo', 'latinName'],
    isArray: true,
  })
  blockers?: CardBlocker[];
}

export class DocumentRequestOptionsResponseDto {
  @ApiProperty({ type: [DocumentRequestOptionDto] })
  options: DocumentRequestOptionDto[];
}

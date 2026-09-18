import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

export class MembershipTypeInfoResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.REGULAR })
  type: MembershipType;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  summary?: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  rights?: LocalizedTextDto;

  @ApiPropertyOptional({ example: '2026-09-18T09:00:00.000Z' })
  updatedAt?: Date;
}

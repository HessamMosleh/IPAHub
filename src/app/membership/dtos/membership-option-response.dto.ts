import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MembershipQuoteDto } from './membership-quote.dto';

/** One applicable tier as shown to a member: its copy plus a live cost quote. */
export class MembershipOptionDto {
  @ApiProperty({ enum: MembershipType, example: MembershipType.REGULAR })
  type: MembershipType;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  summary?: LocalizedTextDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  rights?: LocalizedTextDto;

  @ApiProperty({ type: MembershipQuoteDto })
  quote: MembershipQuoteDto;

  @ApiProperty({
    description: 'Whether this is the tier the member currently holds',
    example: false,
  })
  isCurrent: boolean;
}

/** The membership overview a member sees before applying or renewing. */
export class MembershipOptionsResponseDto {
  @ApiPropertyOptional({
    enum: MembershipType,
    nullable: true,
    description: "The member's current tier, if any",
  })
  currentType: MembershipType | null;

  @ApiPropertyOptional({
    example: '2027-09-18T00:00:00.000Z',
    nullable: true,
    description: 'When the current membership expires (null = no dated term)',
  })
  membershipExpiresAt: Date | null;

  @ApiProperty({
    description: 'Whether the member has an open request blocking new ones',
    example: false,
  })
  hasOpenRequest: boolean;

  @ApiProperty({ type: [MembershipOptionDto] })
  options: MembershipOptionDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';

/** The itemised cost of a tier for a specific member, computed live. */
export class MembershipQuoteDto {
  @ApiProperty({ description: 'Annual fee in Rials', example: 5000000 })
  fee: number;

  @ApiPropertyOptional({
    enum: MembershipType,
    nullable: true,
    description: 'The tier the credit was earned on (current tier), if any',
  })
  creditType: MembershipType | null;

  @ApiProperty({
    description: 'Credit carried over from the current tier',
    example: 3000000,
  })
  creditApplied: number;

  @ApiProperty({
    description: 'One-time entrance fee, added after credit',
    example: 2000000,
  })
  entranceFee: number;

  @ApiProperty({
    description: 'What the member owes: max(0, fee - credit) + entranceFee',
    example: 4000000,
  })
  amountDue: number;
}

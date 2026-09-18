import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';

export class ProvinceMembershipPriceDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  province: any;

  @ApiProperty({ example: 4000000 })
  fee: number;

  @ApiPropertyOptional({
    example: 1500000,
    nullable: true,
    description: 'Entrance fee override; null means use the national amount',
  })
  entranceFee?: number;
}

export class MembershipFeeResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.REGULAR })
  type: MembershipType;

  @ApiProperty({ example: 5000000 })
  baseFee: number;

  @ApiProperty({ example: 2000000 })
  entranceFee: number;

  @ApiProperty({ type: [ProvinceMembershipPriceDto] })
  prices: ProvinceMembershipPriceDto[];

  @ApiPropertyOptional({ example: '2026-09-18T09:00:00.000Z' })
  createdAt?: Date;
}

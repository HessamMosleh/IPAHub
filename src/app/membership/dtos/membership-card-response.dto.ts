import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipType } from '../../../common/enums/membership-type.enum';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';

export class MembershipCardResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({
    description: 'The document request this card was issued for',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  request: string;

  @ApiPropertyOptional({
    description: 'The member this card was issued to',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  user?: string;

  @ApiProperty({
    type: MediaFileDto,
    description: 'Front face image metadata in storage',
  })
  frontImage: MediaFileDto;

  @ApiProperty({
    type: MediaFileDto,
    description: 'Back face image metadata in storage',
  })
  backImage: MediaFileDto;

  @ApiProperty({
    enum: MembershipType,
    example: MembershipType.REGULAR,
    description: 'Snapshot of membership type at issuance',
  })
  membershipType: MembershipType;

  @ApiProperty({
    example: 'پروانه یزدان پناه',
    description: 'Full name printed on the card',
  })
  fullName: string;

  @ApiPropertyOptional({
    example: 'Parvaneh Yazdanpanah',
    description: 'Latin name printed under the portrait',
  })
  latinName?: string;

  @ApiProperty({
    example: '0499370899',
    description: 'National code printed on the card',
  })
  nationalCode: string;

  @ApiProperty({
    example: 1016,
    description: 'Sequential membership number',
  })
  membershipNo: number;

  @ApiPropertyOptional({
    example: 'کارشناسی ارشد روان شناسی بالینی',
    description: 'Academic qualification row (omitted for honorary tier)',
  })
  fieldOfStudy?: string;

  @ApiProperty({
    example: '2026-09-20T09:00:00.000Z',
    description: 'Timestamp when the card was generated and issued',
  })
  issuedAt: Date;

  @ApiProperty({
    example: '2027-09-20T09:00:00.000Z',
    description: 'Card validity expiration timestamp',
  })
  expiresAt: Date;

  @ApiProperty({ example: '2026-09-20T09:00:00.000Z' })
  createdAt: Date;
}

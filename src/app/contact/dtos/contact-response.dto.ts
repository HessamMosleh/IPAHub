import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { SocialLinksDto } from '../../../common/dtos/social-links.dto';

export class ContactInfoResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 'main' })
  key: string;

  @ApiProperty({ type: LocalizedTextDto })
  address: LocalizedTextDto;

  @ApiProperty({ example: '+98 21 8888 0000' })
  phone: string;

  @ApiProperty({ example: 'info@ipa.example' })
  email: string;

  @ApiPropertyOptional({ type: SocialLinksDto })
  socials?: SocialLinksDto;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class ContactMessageResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ example: 'Ali Rezaei' })
  name: string;

  @ApiProperty({ example: 'ali.rezaei@example.com' })
  email: string;

  @ApiProperty({
    example: 'Hello, I have an inquiry about membership application.',
  })
  message: string;

  @ApiProperty({ example: false })
  read: boolean;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedContactMessagesResponseDto {
  @ApiProperty({ type: [ContactMessageResponseDto] })
  data: ContactMessageResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

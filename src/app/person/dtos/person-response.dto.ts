import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { PersonRole } from '../person.schema';
import { PersonLicenseResponseDto } from './person-license.dto';
import { ProvinceResponseDto } from '../../province/dtos/province-response.dto';

export class PersonResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a11' })
  _id: string;

  @ApiProperty({ type: LocalizedTextDto })
  name: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Portrait photo in MinIO',
  })
  photo?: MediaFileDto;

  @ApiProperty({ enum: PersonRole, example: PersonRole.PRESIDENT })
  role: PersonRole;

  @ApiPropertyOptional({
    description:
      'Subrole or position slug (for Vice Presidents or Province Officials)',
    example: 'director',
  })
  subRole?: string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description:
      'Custom official position title (e.g. Inspector title or Consultant specialty)',
  })
  positionTitle?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Biographical summary',
  })
  about?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Rich-text resume/curriculum vitae',
  })
  resume?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Downloadable PDF resume in MinIO',
  })
  resumeFile?: MediaFileDto;

  @ApiPropertyOptional({
    description: 'Direct YouTube or Aparat video link',
    example: 'https://www.aparat.com/v/abc123',
  })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Contact and office location details',
  })
  contact?: LocalizedTextDto;

  @ApiPropertyOptional({
    description: 'Assigned province (for Province Officials)',
    type: () => ProvinceResponseDto,
  })
  province?: ProvinceResponseDto | string;

  @ApiProperty({
    type: [PersonLicenseResponseDto],
    description: 'Professional licenses and certificates',
  })
  licenses: PersonLicenseResponseDto[];

  @ApiProperty({ example: 0, description: 'Display order priority' })
  order: number;

  @ApiProperty({ enum: ActiveStatus, example: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2026-09-17T12:00:00.000Z' })
  updatedAt?: Date;
}

export class PaginatedPeopleResponseDto {
  @ApiProperty({ type: [PersonResponseDto] })
  data: PersonResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

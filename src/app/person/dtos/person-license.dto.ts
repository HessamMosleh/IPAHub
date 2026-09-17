import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';

export class CreatePersonLicenseDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual title of the license or credential',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({
    type: MediaFileDto,
    description: 'License certificate image in MinIO',
  })
  @ValidateNested()
  @Type(() => MediaFileDto)
  image: MediaFileDto;
}

export class PersonLicenseResponseDto {
  @ApiProperty({ example: '66fa3b5a9c1e7a001f3e9a99' })
  _id: string;

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: MediaFileDto })
  image: MediaFileDto;

  @ApiProperty({ example: '2026-09-17T12:00:00.000Z' })
  createdAt: Date;
}

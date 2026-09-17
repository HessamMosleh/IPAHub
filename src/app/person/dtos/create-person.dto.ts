import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import { PersonRole } from '../person.schema';
import { CreatePersonLicenseDto } from './person-license.dto';

export class CreatePersonDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Bilingual full name of the person (English required)',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    enum: PersonRole,
    description: 'Primary role within the organisation',
    example: PersonRole.PRESIDENT,
  })
  @IsEnum(PersonRole, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  role: PersonRole;

  @ApiPropertyOptional({
    description:
      'Subrole (VicePresidentSubRole or ProvincePosition) applicable to VICE_PRESIDENT or PROVINCE_OFFICIAL',
    example: 'director',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  subRole?: string;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description:
      'Official position title (applicable to PROVINCE_OFFICIAL, CONSULTANT, INSPECTOR)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  positionTitle?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Biographical summary',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  about?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Sanitized rich-text resume / CV',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  resume?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: LocalizedTextDto,
    description: 'Contact information & office details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  contact?: LocalizedTextDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Portrait photo in MinIO',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  photo?: MediaFileDto;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Downloadable PDF CV in MinIO',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  resumeFile?: MediaFileDto;

  @ApiPropertyOptional({
    description: 'Introductory video URL (YouTube or Aparat)',
    example: 'https://www.aparat.com/v/abc123',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    description: 'Assigned province ObjectId (required for PROVINCE_OFFICIAL)',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @IsOptional()
  @IsMongoId({ message: i18nValidationMessage('validation.IS_MONGO_ID') })
  province?: string;

  @ApiPropertyOptional({
    type: [CreatePersonLicenseDto],
    description: 'Initial list of licenses or credentials',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePersonLicenseDto)
  licenses?: CreatePersonLicenseDto[];

  @ApiPropertyOptional({
    description: 'Display order priority (ascending)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    enum: ActiveStatus,
    default: ActiveStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status?: ActiveStatus = ActiveStatus.ACTIVE;
}

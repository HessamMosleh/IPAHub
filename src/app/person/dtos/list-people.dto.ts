import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PersonRole } from '../person.schema';

export class ListPeopleDto {
  @ApiPropertyOptional({
    enum: PersonRole,
    description: 'Filter active people by organisational role',
    example: PersonRole.VICE_PRESIDENT,
  })
  @IsOptional()
  @IsEnum(PersonRole, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  role?: PersonRole;

  @ApiPropertyOptional({
    description:
      'Filter by sub-role or position slug (e.g. education, director)',
    example: 'director',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  subRole?: string;

  @ApiPropertyOptional({
    description: 'Filter by province slug or ObjectId (for Province Officials)',
    example: 'tehran-city',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  province?: string;

  @ApiPropertyOptional({
    description:
      'Search across person name and position title in both languages',
    example: 'Hassan',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  search?: string;
}

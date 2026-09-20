import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';

export class MarkAttendedDto {
  @ApiProperty({
    type: Boolean,
    default: true,
    description: 'Attendance verification status (true if member attended)',
    example: true,
  })
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  attended: boolean = true;

  @ApiPropertyOptional({
    type: MediaFileDto,
    description: 'Private attendance / completion certificate file',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  certificate?: MediaFileDto;
}

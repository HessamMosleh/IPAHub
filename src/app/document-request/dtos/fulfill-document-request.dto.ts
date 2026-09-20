import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';

export class FulfillDocumentRequestDto {
  @ApiPropertyOptional({
    description:
      'Private issued document file uploaded to MinIO (required when the request type produces a document)',
    type: MediaFileDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaFileDto)
  file?: MediaFileDto;
}

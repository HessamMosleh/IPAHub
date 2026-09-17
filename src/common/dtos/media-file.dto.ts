import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class MediaFileDto {
  @ApiProperty({
    description: 'MinIO object key',
    example: 'portraits/person-123.jpg',
  })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  key: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Size in bytes', example: 102400 })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(0)
  size?: number;

  @ApiPropertyOptional({
    description: 'Original filename for downloads',
    example: 'portrait.jpg',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  originalName?: string;

  @ApiPropertyOptional({
    description: 'Pixel width (images only)',
    example: 600,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    description: 'Pixel height (images only)',
    example: 800,
  })
  @IsOptional()
  @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
  @Min(1)
  height?: number;
}

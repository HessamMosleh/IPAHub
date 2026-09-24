import { ApiProperty } from '@nestjs/swagger';

export class SingleSettingResponseDto {
  @ApiProperty({
    description: 'Setting key identifier',
    example: 'associationName',
  })
  key: string;

  @ApiProperty({
    description: 'Setting string value',
    example: 'Iranian Petroleum Consultants Association',
  })
  value: string;
}

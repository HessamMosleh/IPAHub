import { ApiProperty } from '@nestjs/swagger';

export class MemberSettingResponseDto {
  @ApiProperty({
    description: 'Member setting key',
    example: 'membershipNoSeq',
  })
  key: string;

  @ApiProperty({
    description: 'Member setting value',
    example: '1000',
  })
  value: string;
}

export class MemberSettingsMapResponseDto {
  @ApiProperty({
    description: 'Map of member settings key-value pairs',
    example: { membershipNoSeq: '1000' },
  })
  settings: Record<string, string>;
}

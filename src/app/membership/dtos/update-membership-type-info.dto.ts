import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dtos/localized-text.dto';

/**
 * Admin-editable, member-facing copy for one tier. English is the required
 * fallback (enforced by `LocalizedTextDto`); `rights` rich text is sanitised in
 * the service at save time.
 */
export class UpdateMembershipTypeInfoDto {
  @ApiProperty({
    type: LocalizedTextDto,
    description: "The tier's lead paragraph: who it is for",
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  summary: LocalizedTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description:
      'The rights/entitlements list, as rich text (sanitised on save)',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  rights: LocalizedTextDto;
}

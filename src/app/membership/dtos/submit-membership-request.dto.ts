import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MembershipType } from '../../../common/enums/membership-type.enum';

/**
 * A member's application for a membership tier.
 *
 * `formData` is deliberately a free-form object: it is validated against the
 * tier's `MEMBERSHIP_FORM_FIELDS` descriptors in the service, not here, because
 * the required keys and their formats depend on `type`.
 */
export class SubmitMembershipRequestDto {
  @ApiProperty({
    enum: MembershipType,
    description:
      'The membership tier being applied for (HONORARY is not allowed)',
    example: MembershipType.REGULAR,
  })
  @IsEnum(MembershipType, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  type: MembershipType;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    description:
      "The tier's application answers, keyed by field descriptor. Required keys and formats depend on the tier.",
    example: {
      centerName: 'Example Consulting Center',
      city: 'Tehran',
      postalCode: '1234567890',
    },
  })
  @IsOptional()
  @IsObject({ message: i18nValidationMessage('validation.IS_OBJECT') })
  formData?: Record<string, string>;
}

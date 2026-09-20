import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ActiveStatus } from '../../../common/enums/active-status.enum';

export class UpdateEventStatusDto {
  @ApiProperty({
    enum: ActiveStatus,
    description: 'Active status (ACTIVE = published and open, DISABLED = draft/hidden)',
    example: ActiveStatus.ACTIVE,
  })
  @IsEnum(ActiveStatus, {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  status: ActiveStatus;
}

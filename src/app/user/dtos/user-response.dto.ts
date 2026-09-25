import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaFileDto } from '../../../common/dtos/media-file.dto';
import {
  EducationLevel,
  MaritalStatus,
  UserRole,
  UserSex,
  UserStatus,
} from '../user.schema';
import { MembershipType } from '../../../common/enums/membership-type.enum';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  mobile: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  latinFullName: string;

  @ApiProperty()
  nationalCode: string;

  @ApiPropertyOptional({ enum: UserSex })
  sex?: UserSex;

  @ApiPropertyOptional()
  birthday?: Date;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty()
  province: string;

  @ApiPropertyOptional({ type: [String] })
  managedProvinces?: string[];

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Whether an administrator account may sign in',
  })
  active?: boolean;

  @ApiPropertyOptional()
  fatherName?: string;

  @ApiPropertyOptional()
  idNumber?: string;

  @ApiPropertyOptional()
  idIssuancePlace?: string;

  @ApiPropertyOptional({ enum: MaritalStatus })
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional()
  landline?: string;

  @ApiPropertyOptional({ enum: EducationLevel })
  educationLevel?: EducationLevel;

  @ApiPropertyOptional()
  fieldOfStudy?: string;

  @ApiPropertyOptional()
  university?: string;

  @ApiPropertyOptional()
  degreeDate?: Date;

  @ApiPropertyOptional({ enum: MembershipType })
  membershipType?: MembershipType;

  @ApiPropertyOptional()
  membershipNo?: number;

  @ApiPropertyOptional()
  membershipExpiresAt?: Date;

  @ApiPropertyOptional({ type: MediaFileDto })
  photo?: MediaFileDto;

  @ApiPropertyOptional()
  mobileVerifiedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class UserPendingCountResponseDto {
  @ApiProperty({
    example: 3,
    description: 'Users with status registering awaiting admin review',
  })
  count: number;
}

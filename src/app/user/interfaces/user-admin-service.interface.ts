import { AuthenticatedUser } from '../../auth/types';
import { User } from '../user.schema';
import { MemberDocument } from '../member-document.schema';
import { MemberDocumentResponseDto } from '../dtos/member-document-response.dto';
import { AdminListUsersDto } from '../dtos/admin-list-users.dto';
import { AdminListAdminsDto } from '../dtos/admin-list-admins.dto';
import { CreateProvinceAdminDto } from '../dtos/create-province-admin.dto';
import { UpdateProvinceAdminDto } from '../dtos/update-province-admin.dto';
import { RejectUserDto } from '../dtos/reject-user.dto';

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IUserAdminService {
  findAllMembers(
    query?: AdminListUsersDto,
    admin?: AuthenticatedUser,
  ): Promise<PaginatedUsers>;

  countPendingMembers(admin?: AuthenticatedUser): Promise<{ count: number }>;

  findMemberById(id: string, admin?: AuthenticatedUser): Promise<User>;

  approveMember(id: string, admin?: AuthenticatedUser): Promise<User>;

  rejectMember(
    id: string,
    dto: RejectUserDto,
    admin?: AuthenticatedUser,
  ): Promise<User>;

  listMemberDocuments(
    id: string,
    admin?: AuthenticatedUser,
  ): Promise<MemberDocumentResponseDto[]>;

  getMemberDocument(
    id: string,
    kind: string,
    admin?: AuthenticatedUser,
  ): Promise<MemberDocument>;

  findAllAdmins(query?: AdminListAdminsDto): Promise<PaginatedUsers>;

  findAdminById(id: string): Promise<User>;

  createProvinceAdmin(dto: CreateProvinceAdminDto): Promise<User>;

  updateProvinceAdmin(id: string, dto: UpdateProvinceAdminDto): Promise<User>;

  deleteProvinceAdmin(id: string): Promise<{ success: boolean }>;
}

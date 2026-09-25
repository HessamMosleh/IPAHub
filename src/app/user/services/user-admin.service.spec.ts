import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserAdminService } from './user-admin.service';
import { User, UserRole, UserStatus } from '../user.schema';
import { Province } from '../../../common/schemas/province.schema';
import { MemberDocument } from '../member-document.schema';
import { MembershipRequest } from '../../membership/schemas/membership-request.schema';
import { UserService } from '../services/user.service';
import { SmsSender } from '../../auth/sms.stub';
import { MemberDocumentKind } from '../member-document.schema';
import { AuthenticatedUser } from '../../auth/types';
import {
  buildMemberDocumentModelMock,
  buildMembershipRequestModelMock,
  buildProvinceAdminFixture,
  buildProvinceModelMock,
  buildQueryChain,
  buildSmsSenderMock,
  buildUserFixture,
  buildUserModelMock,
  buildUserServiceMock,
  FIXED_ADMIN_ID,
  FIXED_OTHER_PROVINCE_ID,
  FIXED_PROVINCE_ID,
  FIXED_USER_ID,
} from './__test-helpers__/user-test-fixtures';

describe('UserAdminService', () => {
  let service: UserAdminService;
  let userModel: ReturnType<typeof buildUserModelMock>;
  let provinceModel: ReturnType<typeof buildProvinceModelMock>;
  let memberDocumentModel: ReturnType<typeof buildMemberDocumentModelMock>;
  let membershipRequestModel: ReturnType<
    typeof buildMembershipRequestModelMock
  >;
  let userService: ReturnType<typeof buildUserServiceMock>;
  let smsSender: ReturnType<typeof buildSmsSenderMock>;

  const superAdmin: AuthenticatedUser = {
    id: FIXED_ADMIN_ID,
    mobile: '+989120000001',
    roles: [UserRole.SUPER_ADMIN],
    province: FIXED_PROVINCE_ID,
    jti: 'jti-super',
  };

  const provinceAdmin: AuthenticatedUser = {
    id: FIXED_ADMIN_ID,
    mobile: '+989120000002',
    roles: [UserRole.PROVINCE_ADMIN],
    province: FIXED_PROVINCE_ID,
    managedProvinces: [FIXED_PROVINCE_ID],
    jti: 'jti-province',
  };

  const pendingMember = (overrides: Record<string, any> = {}) =>
    buildUserFixture({
      status: UserStatus.REGISTERING,
      membershipNo: null,
      ...overrides,
    });

  beforeEach(async () => {
    userModel = buildUserModelMock();
    provinceModel = buildProvinceModelMock();
    memberDocumentModel = buildMemberDocumentModelMock();
    membershipRequestModel = buildMembershipRequestModelMock();
    userService = buildUserServiceMock();
    smsSender = buildSmsSenderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAdminService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Province.name), useValue: provinceModel },
        {
          provide: getModelToken(MemberDocument.name),
          useValue: memberDocumentModel,
        },
        {
          provide: getModelToken(MembershipRequest.name),
          useValue: membershipRequestModel,
        },
        { provide: UserService, useValue: userService },
        { provide: SmsSender, useValue: smsSender },
      ],
    }).compile();

    service = module.get<UserAdminService>(UserAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllMembers', () => {
    it('returns paginated members sorted by status then newest first', async () => {
      const member = buildUserFixture();
      userModel.find.mockReturnValue(buildQueryChain([member]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(1));

      const result = await service.findAllMembers({ page: 1, limit: 20 });

      expect(userModel.find).toHaveBeenCalledWith({
        status: { $ne: 'deleted' },
        roles: 'user',
      });
      const chain = userModel.find.mock.results[0].value;
      expect(chain.sort).toHaveBeenCalledWith({ status: 1, createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [member],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('applies a status filter when supplied', async () => {
      userModel.find.mockReturnValue(buildQueryChain([]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllMembers({ status: UserStatus.REGISTERING });

      expect(userModel.find).toHaveBeenCalledWith({
        status: 'registering',
        roles: 'user',
      });
    });

    it('scopes a province admin to their managed provinces', async () => {
      userModel.find.mockReturnValue(buildQueryChain([]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllMembers({}, provinceAdmin);

      expect(userModel.find).toHaveBeenCalledWith({
        status: { $ne: 'deleted' },
        roles: 'user',
        province: { $in: [new Types.ObjectId(FIXED_PROVINCE_ID)] },
      });
    });

    it('lets a super admin see every province', async () => {
      userModel.find.mockReturnValue(buildQueryChain([]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllMembers({}, superAdmin);

      expect(userModel.find).toHaveBeenCalledWith({
        status: { $ne: 'deleted' },
        roles: 'user',
      });
    });

    it('blocks a province admin from filtering to an unmanaged province', async () => {
      await expect(
        service.findAllMembers(
          { province: FIXED_OTHER_PROVINCE_ID },
          provinceAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(userModel.find).not.toHaveBeenCalled();
    });

    it('escapes a search term before building the regex', async () => {
      userModel.find.mockReturnValue(buildQueryChain([]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllMembers({ search: 'a.b*c' });

      const filter = userModel.find.mock.calls[0][0];
      expect(filter.$or).toEqual([
        { fullName: /a\.b\*c/i },
        { latinFullName: /a\.b\*c/i },
        { mobile: /a\.b\*c/i },
        { nationalCode: /a\.b\*c/i },
        { email: /a\.b\*c/i },
      ]);
    });
  });

  describe('countPendingMembers', () => {
    it('counts registering members only', async () => {
      userModel.countDocuments.mockReturnValue(buildQueryChain(3));

      const result = await service.countPendingMembers(superAdmin);

      expect(userModel.countDocuments).toHaveBeenCalledWith({
        status: 'registering',
        roles: 'user',
      });
      expect(result).toEqual({ count: 3 });
    });

    it('counts only registering members inside a province admin scope', async () => {
      userModel.countDocuments.mockReturnValue(buildQueryChain(1));

      await service.countPendingMembers(provinceAdmin);

      expect(userModel.countDocuments).toHaveBeenCalledWith({
        status: 'registering',
        roles: 'user',
        province: { $in: [new Types.ObjectId(FIXED_PROVINCE_ID)] },
      });
    });
  });

  describe('findMemberById', () => {
    it('returns the member', async () => {
      const member = pendingMember();
      userModel.findOne.mockReturnValue(buildQueryChain(member));

      const result = await service.findMemberById(FIXED_USER_ID, superAdmin);

      expect(userModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_USER_ID,
        status: { $ne: 'deleted' },
        roles: 'user',
      });
      expect(result).toBe(member);
    });

    it('throws NotFoundException for an invalid id', async () => {
      await expect(
        service.findMemberById('not-an-id', superAdmin),
      ).rejects.toThrow(NotFoundException);
      expect(userModel.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the member does not exist', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findMemberById(FIXED_USER_ID, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('forbids a province admin from reading a member in another province', async () => {
      const member = buildUserFixture({ province: FIXED_OTHER_PROVINCE_ID });
      userModel.findOne.mockReturnValue(buildQueryChain(member));

      await expect(
        service.findMemberById(FIXED_USER_ID, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveMember', () => {
    it('activates a registering member, assigns a membership number and texts them', async () => {
      const member = pendingMember();
      // loadMember -> highest-number lookup -> re-read after save.
      userModel.findOne.mockReturnValueOnce(buildQueryChain(member));
      userModel.findOne.mockReturnValueOnce(buildQueryChain(null));
      userModel.findOne.mockReturnValueOnce(buildQueryChain(member));
      membershipRequestModel.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue(false),
      });

      const result = await service.approveMember(FIXED_USER_ID, superAdmin);

      expect(member.status).toBe(UserStatus.ACTIVE);
      expect(member.membershipNo).toBe(1000);
      expect(member.rejectionReason).toBeUndefined();
      expect(member.save).toHaveBeenCalled();
      expect(smsSender.send).toHaveBeenCalledWith(
        member.mobile,
        expect.stringContaining('1000'),
      );
      expect(result).toBe(member);
    });

    it('keeps an existing membership number instead of issuing a new one', async () => {
      const member = pendingMember({ membershipNo: 1042 });
      // loadMember -> re-read after save. nextMembershipNo never runs.
      userModel.findOne.mockReturnValueOnce(buildQueryChain(member));
      userModel.findOne.mockReturnValueOnce(buildQueryChain(member));
      membershipRequestModel.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue(false),
      });

      const result = await service.approveMember(FIXED_USER_ID, superAdmin);

      expect(member.membershipNo).toBe(1042);
      expect(userModel.findOne).toHaveBeenCalledTimes(2);
      expect(result).toBe(member);
    });

    it('increments the highest issued membership number', async () => {
      const member = pendingMember();
      const reloaded = pendingMember({
        membershipNo: 1056,
        status: UserStatus.ACTIVE,
      });
      // loadMember -> highest-number lookup -> re-read after save.
      userModel.findOne.mockReturnValueOnce(buildQueryChain(member));
      membershipRequestModel.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue(false),
      });
      userModel.findOne.mockReturnValueOnce(
        buildQueryChain(buildUserFixture({ membershipNo: 1055 })),
      );
      userModel.findOne.mockReturnValueOnce(buildQueryChain(reloaded));

      const result = await service.approveMember(FIXED_USER_ID, superAdmin);

      expect(member.membershipNo).toBe(1056);
      expect(result).toBe(reloaded);
    });

    it('refuses to approve while a membership bill is outstanding', async () => {
      const member = pendingMember();
      userModel.findOne.mockReturnValue(buildQueryChain(member));
      membershipRequestModel.exists.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'req-1' }),
      });

      await expect(
        service.approveMember(FIXED_USER_ID, superAdmin),
      ).rejects.toThrow(BadRequestException);

      expect(member.save).not.toHaveBeenCalled();
      expect(smsSender.send).not.toHaveBeenCalled();
    });

    it('forbids a province admin from approving a member in another province', async () => {
      const member = buildUserFixture({ province: FIXED_OTHER_PROVINCE_ID });
      userModel.findOne.mockReturnValue(buildQueryChain(member));

      await expect(
        service.approveMember(FIXED_USER_ID, provinceAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(membershipRequestModel.exists).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the member does not exist', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.approveMember(FIXED_USER_ID, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectMember', () => {
    it('rejects a registering member, cancels open requests and texts them', async () => {
      const member = pendingMember();
      userModel.findOne.mockReturnValue(buildQueryChain(member));
      membershipRequestModel.updateMany.mockReturnValue({ exec: jest.fn() });

      const result = await service.rejectMember(
        FIXED_USER_ID,
        { reason: ' Documents unclear ' },
        superAdmin,
      );

      expect(member.status).toBe(UserStatus.REJECTED);
      expect(member.rejectionReason).toBe('Documents unclear');
      expect(member.save).toHaveBeenCalled();
      expect(membershipRequestModel.updateMany).toHaveBeenCalledWith(
        {
          user: member._id,
          status: { $in: ['pending', 'awaiting-payment'] },
        },
        {
          $set: expect.objectContaining({
            status: 'rejected',
            rejectionReason: 'Documents unclear',
          }),
        },
      );
      expect(smsSender.send).toHaveBeenCalledWith(
        member.mobile,
        expect.stringContaining('Reason: Documents unclear'),
      );
      expect(result).toBe(member);
    });

    it('rejects without a reason when none is given', async () => {
      const member = pendingMember();
      userModel.findOne.mockReturnValue(buildQueryChain(member));
      membershipRequestModel.updateMany.mockReturnValue({ exec: jest.fn() });

      await service.rejectMember(FIXED_USER_ID, {}, superAdmin);

      expect(member.rejectionReason).toBeUndefined();
      expect(smsSender.send).toHaveBeenCalledWith(
        member.mobile,
        expect.not.stringContaining('Reason'),
      );
    });

    it('refuses to downgrade an already approved member', async () => {
      const member = buildUserFixture({ status: UserStatus.ACTIVE });
      userModel.findOne.mockReturnValue(buildQueryChain(member));

      await expect(
        service.rejectMember(FIXED_USER_ID, { reason: 'no' }, superAdmin),
      ).rejects.toThrow(BadRequestException);

      expect(member.save).not.toHaveBeenCalled();
      expect(membershipRequestModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('member documents', () => {
    it('lists a member documents through the member service after a scope check', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(pendingMember()));
      userService.listDocuments.mockResolvedValue([]);

      await service.listMemberDocuments(FIXED_USER_ID, provinceAdmin);

      expect(userService.listDocuments).toHaveBeenCalledWith(FIXED_USER_ID);
    });

    it('rejects an unknown document kind', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(pendingMember()));

      await expect(
        service.getMemberDocument(FIXED_USER_ID, 'not-a-kind', superAdmin),
      ).rejects.toThrow(BadRequestException);

      expect(userService.getDocument).not.toHaveBeenCalled();
    });

    it('delegates a valid kind to the member service', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(pendingMember()));
      const doc = { _id: 'doc-1', kind: MemberDocumentKind.ACTIVITY_LICENSE };
      userService.getDocument.mockResolvedValue(doc);

      const result = await service.getMemberDocument(
        FIXED_USER_ID,
        MemberDocumentKind.ACTIVITY_LICENSE,
        superAdmin,
      );

      expect(userService.getDocument).toHaveBeenCalledWith(
        FIXED_USER_ID,
        MemberDocumentKind.ACTIVITY_LICENSE,
      );
      expect(result).toBe(doc);
    });
  });

  describe('findAllAdmins', () => {
    it('lists province admins only, newest first', async () => {
      const admin = buildProvinceAdminFixture();
      userModel.find.mockReturnValue(buildQueryChain([admin]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(1));

      const result = await service.findAllAdmins({ page: 1, limit: 50 });

      expect(userModel.find).toHaveBeenCalledWith({
        status: { $ne: 'deleted' },
        roles: { $eq: [UserRole.PROVINCE_ADMIN] },
      });
      const chain = userModel.find.mock.results[0].value;
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.total).toBe(1);
    });

    it('filters by active flag and managed province', async () => {
      userModel.find.mockReturnValue(buildQueryChain([]));
      userModel.countDocuments.mockReturnValue(buildQueryChain(0));

      await service.findAllAdmins({
        active: false,
        province: FIXED_PROVINCE_ID,
      });

      const filter = userModel.find.mock.calls[0][0];
      expect(filter.active).toBe(false);
      expect(
        (filter as Record<string, unknown>).managedProvinces,
      ).toBeInstanceOf(Types.ObjectId);
    });
  });

  describe('createProvinceAdmin', () => {
    const createDto = () => ({
      mobile: '091200000011',
      nationalCode: '0099887766',
      fullName: 'Seyed Karimi',
      latinFullName: 'Seyed Karimi',
      password: 'Secret123!',
      managedProvinces: [FIXED_PROVINCE_ID],
      email: 'seyed@ipa.local',
    });

    it('creates a province admin with an E.164 mobile and a hashed password', async () => {
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      userModel.findOne.mockReturnValue(buildQueryChain(null));
      userService.hashPassword.mockResolvedValue('hashed-secret');
      const created = buildProvinceAdminFixture({ _id: FIXED_ADMIN_ID });
      userModel.create.mockResolvedValue(created);
      userModel.findOne.mockReturnValueOnce(buildQueryChain(null));
      userModel.findOne.mockReturnValueOnce(buildQueryChain(created));

      const result = await service.createProvinceAdmin(createDto());

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mobile: '+9891200000011',
          nationalCode: '0099887766',
          roles: [UserRole.PROVINCE_ADMIN],
          province: expect.any(Types.ObjectId),
          managedProvinces: [expect.any(Types.ObjectId)],
          status: UserStatus.ACTIVE,
          active: true,
          password: 'hashed-secret',
        }),
      );
      expect(result).toBe(created);
    });

    it('refuses when a managed province does not exist', async () => {
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(service.createProvinceAdmin(createDto())).rejects.toThrow(
        NotFoundException,
      );

      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('reports a duplicate mobile as a conflict', async () => {
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      userModel.findOne.mockReturnValue(
        buildQueryChain(buildUserFixture({ mobile: '+9891200000011' })),
      );

      await expect(service.createProvinceAdmin(createDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('turns a duplicate-key error from create into a conflict', async () => {
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      userModel.findOne.mockReturnValue(buildQueryChain(null));
      userModel.create.mockRejectedValue({
        code: 11000,
        keyPattern: { nationalCode: 1 },
      });

      await expect(service.createProvinceAdmin(createDto())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateProvinceAdmin', () => {
    it('replaces managed provinces and re-homes the admin when theirs is dropped', async () => {
      const admin = buildProvinceAdminFixture();
      userModel.findOne.mockReturnValueOnce(buildQueryChain(admin));
      userModel.findOne.mockReturnValueOnce(
        buildQueryChain(buildProvinceAdminFixture()),
      );
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await service.updateProvinceAdmin(FIXED_ADMIN_ID, {
        managedProvinces: [FIXED_OTHER_PROVINCE_ID],
      });

      expect(admin.managedProvinces).toEqual([
        new Types.ObjectId(FIXED_OTHER_PROVINCE_ID),
      ]);
      expect(String(admin.province)).toBe(FIXED_OTHER_PROVINCE_ID);
      expect(admin.save).toHaveBeenCalled();
    });

    it('keeps the home province when it stays in the managed set', async () => {
      const admin = buildProvinceAdminFixture();
      userModel.findOne.mockReturnValueOnce(buildQueryChain(admin));
      userModel.findOne.mockReturnValueOnce(
        buildQueryChain(buildProvinceAdminFixture()),
      );
      provinceModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });

      await service.updateProvinceAdmin(FIXED_ADMIN_ID, {
        managedProvinces: [FIXED_OTHER_PROVINCE_ID, FIXED_PROVINCE_ID],
      });

      expect(admin.managedProvinces).toEqual([
        new Types.ObjectId(FIXED_OTHER_PROVINCE_ID),
        new Types.ObjectId(FIXED_PROVINCE_ID),
      ]);
      expect(admin.province).toBe(FIXED_PROVINCE_ID);
      expect(admin.save).toHaveBeenCalled();
    });

    it('updates scalar fields and re-hashes a supplied password', async () => {
      const admin = buildProvinceAdminFixture();
      userModel.findOne.mockReturnValueOnce(buildQueryChain(admin));
      userModel.findOne.mockReturnValueOnce(
        buildQueryChain(buildProvinceAdminFixture()),
      );
      userService.hashPassword.mockResolvedValue('re-hashed');

      await service.updateProvinceAdmin(FIXED_ADMIN_ID, {
        fullName: 'Seyed Karimi II',
        email: 'new@ipa.local',
        active: false,
        password: 'NewSecret123!',
      });

      expect(admin.fullName).toBe('Seyed Karimi II');
      expect(admin.email).toBe('new@ipa.local');
      expect(admin.active).toBe(false);
      expect(admin.password).toBe('re-hashed');
    });

    it('leaves the password untouched when the field is blank', async () => {
      const admin = buildProvinceAdminFixture({ password: 'keep-me' });
      userModel.findOne.mockReturnValueOnce(buildQueryChain(admin));
      userModel.findOne.mockReturnValueOnce(
        buildQueryChain(buildProvinceAdminFixture()),
      );

      await service.updateProvinceAdmin(FIXED_ADMIN_ID, { password: '' });

      expect(admin.password).toBe('keep-me');
      expect(userService.hashPassword).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the admin does not exist', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.updateProvinceAdmin(FIXED_ADMIN_ID, { active: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProvinceAdmin', () => {
    it('soft-deletes the admin and disables login', async () => {
      const admin = buildProvinceAdminFixture();
      userModel.findOne.mockReturnValue(buildQueryChain(admin));

      const result = await service.deleteProvinceAdmin(FIXED_ADMIN_ID);

      expect(admin.status).toBe(UserStatus.DELETED);
      expect(admin.active).toBe(false);
      expect(admin.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException for an unknown admin', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.deleteProvinceAdmin(FIXED_ADMIN_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

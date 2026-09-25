import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../user.schema';
import { Province } from '../../../common/schemas/province.schema';
import { MemberDocument, MemberDocumentKind } from '../member-document.schema';
import { StorageService } from '../../../common/storage/storage.service';
import {
  buildMemberDocumentFixture,
  buildMemberDocumentModelMock,
  buildProvinceAdminFixture,
  buildProvinceModelMock,
  buildQueryChain,
  buildStorageServiceMock,
  buildUserFixture,
  buildUserModelMock,
  FIXED_DOCUMENT_ID,
  FIXED_OTHER_PROVINCE_ID,
  FIXED_PROVINCE_ID,
  FIXED_USER_ID,
} from './__test-helpers__/user-test-fixtures';

describe('UserService', () => {
  let service: UserService;
  let userModel: ReturnType<typeof buildUserModelMock>;
  let provinceModel: ReturnType<typeof buildProvinceModelMock>;
  let memberDocumentModel: ReturnType<typeof buildMemberDocumentModelMock>;
  let storage: ReturnType<typeof buildStorageServiceMock>;

  beforeEach(async () => {
    userModel = buildUserModelMock();
    provinceModel = buildProvinceModelMock();
    memberDocumentModel = buildMemberDocumentModelMock();
    storage = buildStorageServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Province.name), useValue: provinceModel },
        {
          provide: getModelToken(MemberDocument.name),
          useValue: memberDocumentModel,
        },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerMember', () => {
    it('creates a registering member after checking province and identity uniqueness', async () => {
      provinceModel.exists.mockResolvedValue(true);
      userModel.findOne.mockReturnValue(
        buildQueryChain(null), // no existing mobile/national code
      );
      const created = buildUserFixture({ _id: FIXED_USER_ID });
      userModel.create.mockResolvedValue(created);

      const result = await service.registerMember({
        mobile: '09121234567',
        nationalCode: '0012345678',
        fullName: 'Ali Rezaei',
        latinFullName: 'Ali Rezaei',
        province: FIXED_PROVINCE_ID,
      });

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mobile: '+989121234567', // folded to E.164
          nationalCode: '0012345678',
          roles: ['user'],
          status: 'registering',
          province: expect.any(Types.ObjectId),
        }),
      );
      expect(result).toBe(created);
    });

    it('refuses to register against a missing province', async () => {
      provinceModel.exists.mockResolvedValue(false);

      await expect(
        service.registerMember({
          mobile: '09121234567',
          nationalCode: '0012345678',
          fullName: 'Ali Rezaei',
          latinFullName: 'Ali Rezaei',
          province: FIXED_PROVINCE_ID,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('reports a duplicate mobile as a conflict', async () => {
      provinceModel.exists.mockResolvedValue(true);
      userModel.findOne.mockReturnValue(
        buildQueryChain(buildUserFixture({ mobile: '+989121234567' })),
      );

      await expect(
        service.registerMember({
          mobile: '09121234567',
          nationalCode: '9999999999',
          fullName: 'Someone Else',
          latinFullName: 'Someone Else',
          province: FIXED_PROVINCE_ID,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('reports a duplicate national code as a conflict', async () => {
      provinceModel.exists.mockResolvedValue(true);
      userModel.findOne.mockReturnValue(
        buildQueryChain(
          buildUserFixture({
            mobile: '+989199999999',
            nationalCode: '0012345678',
          }),
        ),
      );

      await expect(
        service.registerMember({
          mobile: '09199999999',
          nationalCode: '0012345678',
          fullName: 'Someone Else',
          latinFullName: 'Someone Else',
          province: FIXED_PROVINCE_ID,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('turns a duplicate-key error from create into a conflict', async () => {
      provinceModel.exists.mockResolvedValue(true);
      userModel.findOne.mockReturnValue(buildQueryChain(null));
      userModel.create.mockRejectedValue({
        code: 11000,
        keyPattern: { mobile: 1 },
      });

      await expect(
        service.registerMember({
          mobile: '09121234567',
          nationalCode: '0012345678',
          fullName: 'Ali Rezaei',
          latinFullName: 'Ali Rezaei',
          province: FIXED_PROVINCE_ID,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows non-duplicate errors untouched', async () => {
      provinceModel.exists.mockResolvedValue(true);
      userModel.findOne.mockReturnValue(buildQueryChain(null));
      const boom = new Error('connection lost');
      userModel.create.mockRejectedValue(boom);

      await expect(
        service.registerMember({
          mobile: '09121234567',
          nationalCode: '0012345678',
          fullName: 'Ali Rezaei',
          latinFullName: 'Ali Rezaei',
          province: FIXED_PROVINCE_ID,
        }),
      ).rejects.toBe(boom);
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes a password and verifies it against the produced hash', async () => {
      const hash = await service.hashPassword('ChangeMe123!');

      expect(hash).not.toBe('ChangeMe123!');
      expect(await service.verifyPassword('ChangeMe123!', hash)).toBe(true);
      expect(await service.verifyPassword('wrong-password', hash)).toBe(false);
    });
  });

  describe('findOne', () => {
    it('returns the user when found', async () => {
      const user = buildUserFixture();
      userModel.findOne.mockReturnValue(buildQueryChain(user));

      const result = await service.findOne({ _id: FIXED_USER_ID });

      expect(result).toBe(user);
      expect(userModel.findOne).toHaveBeenCalledWith({
        _id: FIXED_USER_ID,
        status: { $ne: 'deleted' },
      });
    });

    it('throws NotFoundException when the user is missing', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(service.findOne({ _id: FIXED_USER_ID })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByMobileOptional', () => {
    it('returns null rather than throwing when no user matches the mobile', async () => {
      userModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.findByMobileOptional('+989121234567'),
      ).resolves.toBeNull();
    });
  });

  describe('updateUser', () => {
    it('applies a province change as an ObjectId after checking it exists', async () => {
      provinceModel.exists.mockResolvedValue(true);
      const user = buildUserFixture();
      userModel.findByIdAndUpdate.mockReturnValue(buildQueryChain(user));

      const result = await service.updateUser(FIXED_USER_ID, {
        province: FIXED_PROVINCE_ID,
      });

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_USER_ID,
        expect.objectContaining({ province: expect.any(Types.ObjectId) }),
        { new: true },
      );
      expect(result).toBe(user);
    });

    it('refuses an update pointing at a missing province', async () => {
      provinceModel.exists.mockResolvedValue(false);

      await expect(
        service.updateUser(FIXED_USER_ID, { province: FIXED_PROVINCE_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userModel.findByIdAndUpdate.mockReturnValue(buildQueryChain(null));

      await expect(
        service.updateUser(FIXED_USER_ID, { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberProfile', () => {
    it('throws NotFoundException when the user is deleted', async () => {
      userModel.findByIdAndUpdate.mockReturnValue(buildQueryChain(null));

      await expect(
        service.updateMemberProfile(FIXED_USER_ID, { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPhoto', () => {
    it('deletes the previous photo object before storing the new one', async () => {
      const existing = buildUserFixture({
        photo: { key: 'photos/old.png', mimeType: 'image/png' },
      });
      userModel.findOne.mockReturnValue(buildQueryChain(existing));
      const updated = buildUserFixture({ photo: { key: 'photos/new.png' } });
      userModel.findByIdAndUpdate.mockReturnValue(buildQueryChain(updated));

      const photo = { key: 'photos/new.png', mimeType: 'image/png' };
      const result = await service.setPhoto(FIXED_USER_ID, photo);

      expect(storage.deleteObject).toHaveBeenCalledWith('photos/old.png');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_USER_ID,
        { photo },
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('tolerates a failing delete of the previous photo', async () => {
      const existing = buildUserFixture({
        photo: { key: 'photos/old.png', mimeType: 'image/png' },
      });
      userModel.findOne.mockReturnValue(buildQueryChain(existing));
      const updated = buildUserFixture();
      userModel.findByIdAndUpdate.mockReturnValue(buildQueryChain(updated));
      storage.deleteObject.mockRejectedValue(new Error('minio down'));

      await expect(
        service.setPhoto(FIXED_USER_ID, { key: 'photos/new.png' } as any),
      ).resolves.toBe(updated);
    });
  });

  describe('documents', () => {
    it('lists a member document as a response dto', async () => {
      const doc = buildMemberDocumentFixture(
        MemberDocumentKind.ACTIVITY_LICENSE,
      );
      memberDocumentModel.find.mockReturnValue(buildQueryChain([doc]));

      const [result] = await service.listDocuments(FIXED_USER_ID);

      expect(result).toEqual({
        _id: FIXED_DOCUMENT_ID,
        kind: MemberDocumentKind.ACTIVITY_LICENSE,
        file: doc.file,
        createdAt: doc.createdAt,
      });
    });

    it('throws NotFoundException when the requested document kind is missing', async () => {
      memberDocumentModel.findOne.mockReturnValue(buildQueryChain(null));

      await expect(
        service.getDocument(FIXED_USER_ID, MemberDocumentKind.STUDENT_CARD),
      ).rejects.toThrow(NotFoundException);
    });

    it('overwrites an existing document of the same kind, deleting the old object', async () => {
      const existing = buildMemberDocumentFixture(
        MemberDocumentKind.ACTIVITY_LICENSE,
        {
          file: { key: 'documents/old.pdf', mimeType: 'application/pdf' },
        },
      );
      memberDocumentModel.findOne.mockReturnValue(buildQueryChain(existing));

      const file = { key: 'documents/new.pdf', mimeType: 'application/pdf' };
      await service.upsertDocument(
        FIXED_USER_ID,
        MemberDocumentKind.ACTIVITY_LICENSE,
        file,
      );

      expect(storage.deleteObject).toHaveBeenCalledWith('documents/old.pdf');
      expect(existing.file).toBe(file);
      expect(existing.save).toHaveBeenCalled();
      expect(memberDocumentModel.create).not.toHaveBeenCalled();
    });

    it('creates a document row when the kind is new', async () => {
      memberDocumentModel.findOne.mockReturnValue(buildQueryChain(null));
      const created = buildMemberDocumentFixture(
        MemberDocumentKind.WORKPLACE_CERTIFICATE,
      );
      memberDocumentModel.create.mockResolvedValue(created);

      const file = { key: 'documents/wp.pdf', mimeType: 'application/pdf' };
      const result = await service.upsertDocument(
        FIXED_USER_ID,
        MemberDocumentKind.WORKPLACE_CERTIFICATE,
        file,
      );

      expect(memberDocumentModel.create).toHaveBeenCalledWith({
        user: expect.any(Types.ObjectId),
        kind: MemberDocumentKind.WORKPLACE_CERTIFICATE,
        file,
      });
      expect(result.kind).toBe(MemberDocumentKind.WORKPLACE_CERTIFICATE);
    });

    it('deletes the stored object alongside the document row', async () => {
      const doc = buildMemberDocumentFixture(
        MemberDocumentKind.EDUCATION_CERTIFICATE,
      );
      memberDocumentModel.findOneAndDelete.mockReturnValue(
        buildQueryChain(doc),
      );

      await service.deleteDocument(
        FIXED_USER_ID,
        MemberDocumentKind.EDUCATION_CERTIFICATE,
      );

      expect(storage.deleteObject).toHaveBeenCalledWith(
        'documents/license.pdf',
      );
    });

    it('leaves storage alone when the deleted row had no file', async () => {
      memberDocumentModel.findOneAndDelete.mockReturnValue(
        buildQueryChain(null),
      );

      await service.deleteDocument(
        FIXED_USER_ID,
        MemberDocumentKind.STUDENT_CARD,
      );

      expect(storage.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('toResponse', () => {
    it('normalises a populated province reference to an id string', () => {
      const user = buildUserFixture({
        province: {
          _id: new Types.ObjectId(FIXED_PROVINCE_ID),
          name: 'Tehran',
        } as any,
      });

      const response = service.toResponse(user as any);

      expect(response.province).toBe(FIXED_PROVINCE_ID);
    });

    it('normalises populated managed provinces to id strings', () => {
      const user = buildProvinceAdminFixture({
        managedProvinces: [
          { _id: new Types.ObjectId(FIXED_PROVINCE_ID) },
          { _id: new Types.ObjectId(FIXED_OTHER_PROVINCE_ID) },
        ] as any,
      });

      const response = service.toResponse(user as any);

      expect(response.managedProvinces).toEqual([
        FIXED_PROVINCE_ID,
        FIXED_OTHER_PROVINCE_ID,
      ]);
    });

    it('reports active as false only when the flag is explicitly false', () => {
      expect(service.toResponse(buildUserFixture() as any).active).toBe(true);
      expect(
        service.toResponse(buildUserFixture({ active: false }) as any).active,
      ).toBe(false);
      expect(
        service.toResponse(buildUserFixture({ active: undefined }) as any)
          .active,
      ).toBe(true);
    });
  });
});

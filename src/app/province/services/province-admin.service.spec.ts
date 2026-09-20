import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProvinceAdminService } from './province-admin.service';
import { Province } from '../../../common/schemas/province.schema';
import { UserRole } from '../../user/user.schema';
import { AuthenticatedUser } from '../../auth/types';
import {
  buildProvinceDoc,
  buildProvinceModelMock,
  buildQueryChain,
} from './__test-helpers__/province-test-fixtures';

describe('ProvinceAdminService', () => {
  let service: ProvinceAdminService;
  let provinceModel: ReturnType<typeof buildProvinceModelMock>;

  const MINE_PROVINCE_ID = '66fa3b5a9c1e7a001f3e9a11';
  const OTHER_PROVINCE_ID = '66fa3b5a9c1e7a001f3e9a22';

  const provinceAdminUser: AuthenticatedUser = {
    userId: 'user-prov-admin',
    mobile: '09121111111',
    roles: [UserRole.PROVINCE_ADMIN],
    managedProvinces: [MINE_PROVINCE_ID],
  };

  const superAdminUser: AuthenticatedUser = {
    userId: 'user-super-admin',
    mobile: '09120000000',
    roles: [UserRole.SUPER_ADMIN],
  };

  beforeEach(async () => {
    provinceModel = buildProvinceModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvinceAdminService,
        {
          provide: getModelToken(Province.name),
          useValue: provinceModel,
        },
      ],
    }).compile();

    service = module.get<ProvinceAdminService>(ProvinceAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateContact', () => {
    it('lets a province admin save contact details for their assigned province', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.updateContact(
        MINE_PROVINCE_ID,
        {
          address: { en: '12 Hafez St, Isfahan', fa: 'اصفهان، خیابان حافظ ۱۲' },
          phone: '03133445566',
          email: 'isfahan@ipa.ir',
        },
        provinceAdminUser,
      );

      expect(doc.contactAddress).toEqual({
        en: '12 Hafez St, Isfahan',
        fa: 'اصفهان، خیابان حافظ ۱۲',
      });
      expect(doc.contactPhone).toBe('03133445566');
      expect(doc.contactEmail).toBe('isfahan@ipa.ir');
      expect(doc.save).toHaveBeenCalled();
      expect(result).toBe(doc);
    });

    it('stores a phone typed in Persian digits as ASCII digits', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        MINE_PROVINCE_ID,
        { phone: '۰۳۱۳۳۴۴۵۵۶۶' },
        provinceAdminUser,
      );

      expect(doc.contactPhone).toBe('03133445566');
      expect(doc.save).toHaveBeenCalled();
    });

    it('keeps digits typed inside address untouched (not folded)', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        MINE_PROVINCE_ID,
        {
          address: { en: 'No. 12', fa: 'پلاک ۱۲' },
        },
        provinceAdminUser,
      );

      expect(doc.contactAddress).toEqual({ en: 'No. 12', fa: 'پلاک ۱۲' });
    });

    it('clears fields when submitted empty or null', async () => {
      const doc = buildProvinceDoc({
        contactAddress: { en: 'Old address' },
        contactPhone: '02100000000',
        contactEmail: 'old@ipa.ir',
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        MINE_PROVINCE_ID,
        {
          address: null as unknown as undefined,
          phone: '',
          email: '',
        },
        provinceAdminUser,
      );

      expect(doc.contactAddress).toBeUndefined();
      expect(doc.contactPhone).toBeUndefined();
      expect(doc.contactEmail).toBeUndefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it('clears address when passed empty localized strings { en: "", fa: "" }', async () => {
      const doc = buildProvinceDoc({
        contactAddress: { en: 'Old address', fa: 'آدرس قبلی' },
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        MINE_PROVINCE_ID,
        {
          address: { en: '', fa: '' },
        },
        provinceAdminUser,
      );

      expect(doc.contactAddress).toBeUndefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it('refuses the whole save when email is unparseable', async () => {
      const doc = buildProvinceDoc({
        contactPhone: '02100000000',
        contactEmail: 'good@ipa.ir',
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.updateContact(
          MINE_PROVINCE_ID,
          { phone: '02111111111', email: 'ask at the office' },
          provinceAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(doc.save).not.toHaveBeenCalled();
      expect(doc.contactEmail).toBe('good@ipa.ir');
    });

    it('refuses a phone with no digits in it rather than publishing a broken tel link', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.updateContact(
          MINE_PROVINCE_ID,
          { phone: 'call the office' },
          provinceAdminUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(doc.save).not.toHaveBeenCalled();
    });

    it('blocks a province admin from editing another province', async () => {
      await expect(
        service.updateContact(
          OTHER_PROVINCE_ID,
          { email: 'hijack@ipa.ir' },
          provinceAdminUser,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(provinceModel.findById).not.toHaveBeenCalled();
    });

    it('lets a super admin save contact details for any province', async () => {
      const doc = buildProvinceDoc({ _id: OTHER_PROVINCE_ID });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        OTHER_PROVINCE_ID,
        { email: 'other@ipa.ir' },
        superAdminUser,
      );

      expect(doc.contactEmail).toBe('other@ipa.ir');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when province does not exist', async () => {
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateContact(
          MINE_PROVINCE_ID,
          { email: 'test@ipa.ir' },
          superAdminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts contactAddress, contactPhone, contactEmail aliases', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.updateContact(
        MINE_PROVINCE_ID,
        {
          contactAddress: { en: 'Alias Address' },
          contactPhone: '03112345678',
          contactEmail: 'alias@ipa.ir',
        },
        superAdminUser,
      );

      expect(doc.contactAddress).toEqual({ en: 'Alias Address' });
      expect(doc.contactPhone).toBe('03112345678');
      expect(doc.contactEmail).toBe('alias@ipa.ir');
    });
  });

  describe('create', () => {
    it('creates province with valid contact details and folded phone digits', async () => {
      provinceModel.findOne
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(buildQueryChain({ order: 5 }));
      provinceModel.create.mockImplementation((data: unknown) =>
        Promise.resolve(data),
      );

      await service.create({
        slug: 'isfahan',
        name: { en: 'Isfahan', fa: 'اصفهان' },
        contactAddress: { en: 'Main Blvd', fa: 'بلوار اصلی' },
        contactPhone: '۰۳۱۳۳۴۴۵۵۶۶',
        contactEmail: 'isfahan@ipa.ir',
      });

      expect(provinceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'isfahan',
          contactAddress: { en: 'Main Blvd', fa: 'بلوار اصلی' },
          contactPhone: '03133445566',
          contactEmail: 'isfahan@ipa.ir',
        }),
      );
    });

    it('throws BadRequestException if phone contains no digits during create', async () => {
      provinceModel.findOne
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(buildQueryChain(null));

      await expect(
        service.create({
          slug: 'isfahan',
          name: { en: 'Isfahan' },
          contactPhone: 'invalid-phone-without-digits',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if email is invalid during create', async () => {
      provinceModel.findOne
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(buildQueryChain(null));

      await expect(
        service.create({
          slug: 'isfahan',
          name: { en: 'Isfahan' },
          contactEmail: 'not-an-email',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates contact details in general update', async () => {
      const doc = buildProvinceDoc();
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.update(MINE_PROVINCE_ID, {
        contactPhone: '۰۳۱۳۳۴۴۵۵۶۶',
        contactEmail: 'new@ipa.ir',
      });

      expect(doc.contactPhone).toBe('03133445566');
      expect(doc.contactEmail).toBe('new@ipa.ir');
      expect(doc.save).toHaveBeenCalled();
    });

    it('clears contact details when passed empty or null in update', async () => {
      const doc = buildProvinceDoc({
        contactPhone: '03112345678',
        contactEmail: 'old@ipa.ir',
        contactAddress: { en: 'Old' },
      });
      provinceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.update(MINE_PROVINCE_ID, {
        contactPhone: '',
        contactEmail: '',
        contactAddress: null as unknown as undefined,
      });

      expect(doc.contactPhone).toBeUndefined();
      expect(doc.contactEmail).toBeUndefined();
      expect(doc.contactAddress).toBeUndefined();
      expect(doc.save).toHaveBeenCalled();
    });
  });
});

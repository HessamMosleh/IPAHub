import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ContactAdminService } from './contact-admin.service';
import { ContactInfo } from '../schemas/contact-info.schema';
import { ContactMessage } from '../schemas/contact-message.schema';
import {
  buildContactInfo,
  buildContactInfoModelMock,
  buildContactMessage,
  buildContactMessageModelMock,
  buildQueryChain,
  FIXED_MESSAGE_ID,
} from './__test-helpers__/contact-test-fixtures';

describe('ContactAdminService', () => {
  let service: ContactAdminService;
  let contactInfoModel: ReturnType<typeof buildContactInfoModelMock>;
  let contactMessageModel: ReturnType<typeof buildContactMessageModelMock>;

  beforeEach(async () => {
    contactInfoModel = buildContactInfoModelMock();
    contactMessageModel = buildContactMessageModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactAdminService,
        {
          provide: getModelToken(ContactInfo.name),
          useValue: contactInfoModel,
        },
        {
          provide: getModelToken(ContactMessage.name),
          useValue: contactMessageModel,
        },
      ],
    }).compile();

    service = module.get<ContactAdminService>(ContactAdminService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContactInfo', () => {
    it('returns contact info singleton for admin editing', async () => {
      const info = buildContactInfo();
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(info));

      const result = await service.getContactInfo();

      expect(contactInfoModel.findOne).toHaveBeenCalledWith({ key: 'main' });
      expect(result).toEqual(info);
    });

    it('creates default contact info if missing', async () => {
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(null));
      const created = buildContactInfo();
      contactInfoModel.create.mockResolvedValue(created);

      const result = await service.getContactInfo();

      expect(contactInfoModel.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('saveContactInfo', () => {
    it('saves contact info with folded digits for phone and normalized socials', async () => {
      const dto = {
        address: { en: 'Tehran Office', fa: 'دفتر تهران' },
        phone: '۰۲۱۸۸۸۸۰۰۰۰', // Persian digits
        email: '  Admin@IPA.Local  ',
        socials: {
          telegram: 't.me/ipa_official',
          instagram: 'https://instagram.com/ipa_official',
          whatsapp: '09121234567',
        },
      };

      const updated = buildContactInfo({
        address: dto.address,
        phone: '02188880000',
        email: 'admin@ipa.local',
      });
      contactInfoModel.findOneAndUpdate.mockReturnValue(
        buildQueryChain(updated),
      );

      const result = await service.saveContactInfo(dto);

      expect(contactInfoModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'main' },
        {
          $set: {
            address: { en: 'Tehran Office', fa: 'دفتر تهران' },
            phone: '02188880000',
            email: 'admin@ipa.local',
            socials: {
              facebook: undefined,
              instagram: 'https://instagram.com/ipa_official',
              telegram: 'https://t.me/ipa_official',
              whatsapp: 'https://wa.me/989121234567',
            },
          },
        },
        { new: true, upsert: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('findAllMessages', () => {
    it('returns paginated messages with default page and limit', async () => {
      const msg = buildContactMessage();
      contactMessageModel.find.mockReturnValue(buildQueryChain([msg]));
      contactMessageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAllMessages();

      expect(result).toEqual({
        data: [msg],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('filters messages by read flag and search query', async () => {
      contactMessageModel.find.mockReturnValue(buildQueryChain([]));
      contactMessageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.findAllMessages({
        page: 2,
        limit: 20,
        read: false,
        search: 'membership',
      });

      expect(contactMessageModel.find).toHaveBeenCalledTimes(1);
      const filter = (
        contactMessageModel.find.mock.calls[0] as unknown as [
          Record<string, any>,
        ]
      )[0];
      expect(filter.read).toBe(false);
      expect(filter.$or).toBeDefined();
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });
  });

  describe('findMessageById', () => {
    it('returns contact message by valid id', async () => {
      const msg = buildContactMessage();
      contactMessageModel.findById.mockReturnValue(buildQueryChain(msg));

      const result = await service.findMessageById(FIXED_MESSAGE_ID);

      expect(result).toEqual(msg);
    });

    it('throws NotFoundException on invalid ObjectId', async () => {
      await expect(service.findMessageById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when message not found', async () => {
      contactMessageModel.findById.mockReturnValue(buildQueryChain(null));

      await expect(service.findMessageById(FIXED_MESSAGE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markMessageAsRead', () => {
    it('updates message read status to true by default', async () => {
      const updated = buildContactMessage({ read: true });
      contactMessageModel.findByIdAndUpdate.mockReturnValue(
        buildQueryChain(updated),
      );

      const result = await service.markMessageAsRead(FIXED_MESSAGE_ID);

      expect(contactMessageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FIXED_MESSAGE_ID,
        { $set: { read: true } },
        { new: true },
      );
      expect(result.read).toBe(true);
    });

    it('throws NotFoundException when message does not exist', async () => {
      contactMessageModel.findByIdAndUpdate.mockReturnValue(
        buildQueryChain(null),
      );

      await expect(
        service.markMessageAsRead(FIXED_MESSAGE_ID, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('deletes message by valid id', async () => {
      const msg = buildContactMessage();
      contactMessageModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(msg),
      });

      const result = await service.deleteMessage(FIXED_MESSAGE_ID);

      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException if message to delete does not exist', async () => {
      contactMessageModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteMessage(FIXED_MESSAGE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('seed', () => {
    it('returns seeded: false if singleton already exists', async () => {
      const existing = buildContactInfo();
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(existing));

      const result = await service.seed();

      expect(result.seeded).toBe(false);
      expect(result.contactInfo).toEqual(existing);
      expect(contactInfoModel.create).not.toHaveBeenCalled();
    });

    it('creates singleton and returns seeded: true if missing', async () => {
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(null));
      const created = buildContactInfo();
      contactInfoModel.create.mockResolvedValue(created);

      const result = await service.seed();

      expect(result.seeded).toBe(true);
      expect(result.contactInfo).toEqual(created);
      expect(contactInfoModel.create).toHaveBeenCalled();
    });
  });
});

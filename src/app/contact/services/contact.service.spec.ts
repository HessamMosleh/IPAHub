import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ContactService } from './contact.service';
import { ContactInfo } from '../schemas/contact-info.schema';
import { ContactMessage } from '../schemas/contact-message.schema';
import {
  buildContactInfo,
  buildContactInfoModelMock,
  buildContactMessage,
  buildContactMessageModelMock,
  buildQueryChain,
} from './__test-helpers__/contact-test-fixtures';

describe('ContactService', () => {
  let service: ContactService;
  let contactInfoModel: ReturnType<typeof buildContactInfoModelMock>;
  let contactMessageModel: ReturnType<typeof buildContactMessageModelMock>;

  beforeEach(async () => {
    contactInfoModel = buildContactInfoModelMock();
    contactMessageModel = buildContactMessageModelMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
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

    service = module.get<ContactService>(ContactService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContactInfo', () => {
    it('returns existing contact info singleton', async () => {
      const info = buildContactInfo();
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(info));

      const result = await service.getContactInfo();

      expect(contactInfoModel.findOne).toHaveBeenCalledWith({ key: 'main' });
      expect(result).toEqual(info);
    });

    it('creates default contact info when missing and returns it', async () => {
      contactInfoModel.findOne.mockReturnValue(buildQueryChain(null));
      const created = buildContactInfo();
      contactInfoModel.create.mockResolvedValue(created);

      const result = await service.getContactInfo();

      expect(contactInfoModel.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('submitMessage', () => {
    it('submits a contact message and returns the created document', async () => {
      const dto = {
        name: '  Sara Ahmadi  ',
        email: '  SARA@EXAMPLE.COM  ',
        message: '  Inquiry about services  ',
      };
      const createdMessage = buildContactMessage({
        name: 'Sara Ahmadi',
        email: 'sara@example.com',
        message: 'Inquiry about services',
      });
      contactMessageModel.create.mockResolvedValue(createdMessage);

      const result = await service.submitMessage(dto);

      expect(contactMessageModel.create).toHaveBeenCalledWith({
        name: 'Sara Ahmadi',
        email: 'sara@example.com',
        message: 'Inquiry about services',
        read: false,
      });
      expect(result).toEqual(createdMessage);
    });
  });
});

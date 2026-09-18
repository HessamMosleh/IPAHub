import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContactInfo,
  ContactInfoProp,
  MAIN_CONTACT_INFO_KEY,
} from '../schemas/contact-info.schema';
import { ContactMessage } from '../schemas/contact-message.schema';
import { SubmitContactMessageDto } from '../dtos/submit-contact-message.dto';
import { DEFAULT_CONTACT_INFO } from '../constants/default-contact-info';
import { translate } from '../../../common/utils/translate';
import { IContactService } from '../interfaces/contact-service.interface';

/**
 * Public/Client Contact Service.
 * Follows Single Responsibility Principle (SRP) — handles visitor operations:
 * retrieving contact details and submitting public messages.
 */
@Injectable()
export class ContactService implements IContactService {
  constructor(
    @InjectModel(ContactInfo.name)
    private readonly contactInfoModel: Model<ContactInfo>,
    @InjectModel(ContactMessage.name)
    private readonly contactMessageModel: Model<ContactMessage>,
  ) {}

  /**
   * Retrieves the singleton contact information for the public website.
   * If not found, initializes it idempotently with default information.
   */
  async getContactInfo(): Promise<ContactInfo> {
    let contactInfo = await this.contactInfoModel
      .findOne({ key: MAIN_CONTACT_INFO_KEY })
      .select(ContactInfoProp.general)
      .exec();

    if (!contactInfo) {
      // Auto-initialize default singleton if missing
      contactInfo = await this.contactInfoModel.create({
        key: MAIN_CONTACT_INFO_KEY,
        address: DEFAULT_CONTACT_INFO.address,
        phone: DEFAULT_CONTACT_INFO.phone,
        email: DEFAULT_CONTACT_INFO.email,
        socials: DEFAULT_CONTACT_INFO.socials,
      });
    }

    if (!contactInfo) {
      throw new NotFoundException(translate('errors.CONTACT_INFO_NOT_FOUND'));
    }

    return contactInfo;
  }

  /**
   * Submits a new contact message from a public visitor.
   */
  async submitMessage(dto: SubmitContactMessageDto): Promise<ContactMessage> {
    const created = await this.contactMessageModel.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      message: dto.message.trim(),
      read: false,
    });

    return created;
  }
}

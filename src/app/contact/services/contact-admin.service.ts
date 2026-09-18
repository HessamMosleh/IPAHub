import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import {
  ContactInfo,
  ContactInfoProp,
  MAIN_CONTACT_INFO_KEY,
} from '../schemas/contact-info.schema';
import {
  ContactMessage,
  ContactMessageProp,
} from '../schemas/contact-message.schema';
import { UpdateContactInfoDto } from '../dtos/update-contact-info.dto';
import { AdminListContactMessagesDto } from '../dtos/admin-list-contact-messages.dto';
import { DEFAULT_CONTACT_INFO } from '../constants/default-contact-info';
import { translate } from '../../../common/utils/translate';
import {
  foldDigits,
  normalizeSocialUrl,
  normalizeWhatsapp,
} from '../../../common/utils/social-url.util';
import {
  IContactAdminService,
  PaginatedContactMessages,
} from '../interfaces/contact-admin-service.interface';

/**
 * Administrative Contact Service.
 * Follows Single Responsibility Principle (SRP) and Interface Segregation (ISP) —
 * encapsulates administrative management of contact information and visitor contact messages.
 */
@Injectable()
export class ContactAdminService implements IContactAdminService {
  constructor(
    @InjectModel(ContactInfo.name)
    private readonly contactInfoModel: Model<ContactInfo>,
    @InjectModel(ContactMessage.name)
    private readonly contactMessageModel: Model<ContactMessage>,
  ) {}

  /**
   * Retrieves the contact info singleton for admin inspection/editing.
   * If missing, initializes default contact info.
   */
  async getContactInfo(): Promise<ContactInfo> {
    let info = await this.contactInfoModel
      .findOne({ key: MAIN_CONTACT_INFO_KEY })
      .select(ContactInfoProp.admin)
      .exec();

    if (!info) {
      info = await this.contactInfoModel.create({
        key: MAIN_CONTACT_INFO_KEY,
        address: DEFAULT_CONTACT_INFO.address,
        phone: DEFAULT_CONTACT_INFO.phone,
        email: DEFAULT_CONTACT_INFO.email,
        socials: DEFAULT_CONTACT_INFO.socials,
      });
    }

    if (!info) {
      throw new NotFoundException(translate('errors.CONTACT_INFO_NOT_FOUND'));
    }

    return info;
  }

  /**
   * Updates or upserts the contact info singleton.
   * Normalizes phone and social media URLs.
   */
  async saveContactInfo(dto: UpdateContactInfoDto): Promise<ContactInfo> {
    // Phone numbers arrive potentially with Persian/Arabic digits; fold them to ASCII
    const phone = foldDigits(dto.phone.trim());
    const email = dto.email.trim().toLowerCase();

    const normalizedSocials = dto.socials
      ? {
          facebook: dto.socials.facebook
            ? normalizeSocialUrl(dto.socials.facebook)
            : undefined,
          instagram: dto.socials.instagram
            ? normalizeSocialUrl(dto.socials.instagram)
            : undefined,
          telegram: dto.socials.telegram
            ? normalizeSocialUrl(dto.socials.telegram)
            : undefined,
          whatsapp: dto.socials.whatsapp
            ? normalizeWhatsapp(dto.socials.whatsapp)
            : undefined,
        }
      : undefined;

    const contactInfo = await this.contactInfoModel
      .findOneAndUpdate(
        { key: MAIN_CONTACT_INFO_KEY },
        {
          $set: {
            address: {
              en: dto.address.en.trim(),
              fa: dto.address.fa?.trim(),
            },
            phone,
            email,
            socials: normalizedSocials,
          },
        },
        { new: true, upsert: true },
      )
      .select(ContactInfoProp.admin)
      .exec();

    return contactInfo;
  }

  /**
   * Lists visitor contact messages with pagination, read filter, and search.
   */
  async findAllMessages(
    query?: AdminListContactMessagesDto,
  ): Promise<PaginatedContactMessages> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<ContactMessage> = {};

    if (query?.read !== undefined) {
      filter.read = query.read;
    }

    if (query?.search && query.search.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { message: regex }];
    }

    const [data, total] = await Promise.all([
      this.contactMessageModel
        .find(filter)
        .select(ContactMessageProp.admin)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contactMessageModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * Retrieves a single contact message by its MongoDB ObjectId.
   */
  async findMessageById(id: string): Promise<ContactMessage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    const message = await this.contactMessageModel
      .findById(id)
      .select(ContactMessageProp.admin)
      .exec();

    if (!message) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    return message;
  }

  /**
   * Marks a contact message as read (or updates read status).
   */
  async markMessageAsRead(
    id: string,
    read: boolean = true,
  ): Promise<ContactMessage> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    const message = await this.contactMessageModel
      .findByIdAndUpdate(id, { $set: { read } }, { new: true })
      .select(ContactMessageProp.admin)
      .exec();

    if (!message) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    return message;
  }

  /**
   * Deletes a contact message by id.
   */
  async deleteMessage(id: string): Promise<{ success: boolean }> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    const message = await this.contactMessageModel.findByIdAndDelete(id).exec();
    if (!message) {
      throw new NotFoundException(
        translate('errors.CONTACT_MESSAGE_NOT_FOUND'),
      );
    }

    return { success: true };
  }

  /**
   * Seeds the default singleton contact info idempotently if not already present.
   */
  async seed(): Promise<{ seeded: boolean; contactInfo: ContactInfo }> {
    const existing = await this.contactInfoModel
      .findOne({ key: MAIN_CONTACT_INFO_KEY })
      .select(ContactInfoProp.admin)
      .exec();

    if (existing) {
      return { seeded: false, contactInfo: existing };
    }

    const created = await this.contactInfoModel.create({
      key: MAIN_CONTACT_INFO_KEY,
      address: DEFAULT_CONTACT_INFO.address,
      phone: DEFAULT_CONTACT_INFO.phone,
      email: DEFAULT_CONTACT_INFO.email,
      socials: DEFAULT_CONTACT_INFO.socials,
    });

    return { seeded: true, contactInfo: created };
  }
}

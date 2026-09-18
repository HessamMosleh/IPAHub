import { ContactInfo } from '../schemas/contact-info.schema';
import { ContactMessage } from '../schemas/contact-message.schema';
import { UpdateContactInfoDto } from '../dtos/update-contact-info.dto';
import { AdminListContactMessagesDto } from '../dtos/admin-list-contact-messages.dto';

export interface PaginatedContactMessages {
  data: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Administrative contact service interface.
 * Adheres to Interface Segregation Principle (ISP) and Single Responsibility (SRP):
 * Encapsulates administrative management of contact info and visitor messages.
 */
export interface IContactAdminService {
  /**
   * Retrieves the contact info singleton for admin editing.
   */
  getContactInfo(): Promise<ContactInfo>;

  /**
   * Updates or upserts the contact info singleton.
   * Normalizes phone and social media URLs.
   */
  saveContactInfo(dto: UpdateContactInfoDto): Promise<ContactInfo>;

  /**
   * Lists visitor contact messages with pagination, read filter, and search.
   */
  findAllMessages(
    query?: AdminListContactMessagesDto,
  ): Promise<PaginatedContactMessages>;

  /**
   * Retrieves a single contact message by its MongoDB ObjectId.
   */
  findMessageById(id: string): Promise<ContactMessage>;

  /**
   * Marks a contact message as read (or toggles read status).
   */
  markMessageAsRead(id: string, read?: boolean): Promise<ContactMessage>;

  /**
   * Deletes a contact message by id.
   */
  deleteMessage(id: string): Promise<{ success: boolean }>;

  /**
   * Seeds the default singleton contact info idempotently if not already present.
   */
  seed(): Promise<{ seeded: boolean; contactInfo: ContactInfo }>;
}

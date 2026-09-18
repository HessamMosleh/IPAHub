import { ContactInfo } from '../schemas/contact-info.schema';
import { ContactMessage } from '../schemas/contact-message.schema';
import { SubmitContactMessageDto } from '../dtos/submit-contact-message.dto';

/**
 * Public client contact service interface.
 * Adheres to Interface Segregation Principle (ISP) and Single Responsibility (SRP):
 * Only contains public operations: reading singleton contact info and submitting a contact message.
 */
export interface IContactService {
  /**
   * Retrieves the singleton contact information for the public website.
   * If not found, attempts to seed/return default info or throws NotFoundException.
   */
  getContactInfo(): Promise<ContactInfo>;

  /**
   * Submits a new contact message from a public visitor.
   */
  submitMessage(dto: SubmitContactMessageDto): Promise<ContactMessage>;
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ContactService } from '../services/contact.service';
import { SubmitContactMessageDto } from '../dtos/submit-contact-message.dto';
import {
  ContactInfoResponseDto,
  ContactMessageResponseDto,
} from '../dtos/contact-response.dto';

/**
 * Public/Client Contact Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles visitor operations:
 * retrieving contact details and submitting public messages.
 */
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({
    summary: 'Get association contact information for public display',
  })
  @ApiOkResponse({
    type: ContactInfoResponseDto,
    description: 'The contact information of the association.',
  })
  async getContactInfo(): Promise<ContactInfoResponseDto> {
    const info = await this.contactService.getContactInfo();
    return info as unknown as ContactInfoResponseDto;
  }

  @Post('message')
  @ApiOperation({
    summary: 'Submit a message via the public contact form',
  })
  @ApiCreatedResponse({
    type: ContactMessageResponseDto,
    description: 'The created contact message receipt.',
  })
  async submitMessage(
    @Body() dto: SubmitContactMessageDto,
  ): Promise<ContactMessageResponseDto> {
    const message = await this.contactService.submitMessage(dto);
    return message as unknown as ContactMessageResponseDto;
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/user.schema';
import { ContactAdminService } from '../services/contact-admin.service';
import { UpdateContactInfoDto } from '../dtos/update-contact-info.dto';
import { AdminListContactMessagesDto } from '../dtos/admin-list-contact-messages.dto';
import {
  ContactInfoResponseDto,
  ContactMessageResponseDto,
  PaginatedContactMessagesResponseDto,
} from '../dtos/contact-response.dto';

/**
 * Administrative Contact Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Contact')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/contact')
export class ContactAdminController {
  constructor(private readonly contactAdminService: ContactAdminService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get association contact information for editing',
  })
  @ApiOkResponse({
    type: ContactInfoResponseDto,
    description: 'The contact information singleton.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getContactInfo(): Promise<ContactInfoResponseDto> {
    const info = await this.contactAdminService.getContactInfo();
    return info as unknown as ContactInfoResponseDto;
  }

  @Put('info')
  @ApiOperation({
    summary: 'Update or save association contact information',
  })
  @ApiOkResponse({
    type: ContactInfoResponseDto,
    description: 'The updated contact information.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async saveContactInfo(
    @Body() dto: UpdateContactInfoDto,
  ): Promise<ContactInfoResponseDto> {
    const info = await this.contactAdminService.saveContactInfo(dto);
    return info as unknown as ContactInfoResponseDto;
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Idempotently seed the default contact information singleton',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seeded: { type: 'boolean', example: true },
        contactInfo: { $ref: '#/components/schemas/ContactInfoResponseDto' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async seed(): Promise<{
    seeded: boolean;
    contactInfo: ContactInfoResponseDto;
  }> {
    const result = await this.contactAdminService.seed();
    return {
      seeded: result.seeded,
      contactInfo: result.contactInfo as unknown as ContactInfoResponseDto,
    };
  }

  @Get('messages')
  @ApiOperation({
    summary: 'List contact messages with pagination, read filter, and search',
  })
  @ApiOkResponse({
    type: PaginatedContactMessagesResponseDto,
    description: 'Paginated list of visitor messages.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAllMessages(
    @Query() query: AdminListContactMessagesDto,
  ): Promise<PaginatedContactMessagesResponseDto> {
    const result = await this.contactAdminService.findAllMessages(query);
    return result as unknown as PaginatedContactMessagesResponseDto;
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get contact message by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ContactMessageResponseDto,
    description: 'Contact message details.',
  })
  @ApiNotFoundResponse({ description: 'Contact message not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findMessageById(
    @Param('id') id: string,
  ): Promise<ContactMessageResponseDto> {
    const message = await this.contactAdminService.findMessageById(id);
    return message as unknown as ContactMessageResponseDto;
  }

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Mark contact message as read or unread' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    type: ContactMessageResponseDto,
    description: 'The updated contact message.',
  })
  @ApiNotFoundResponse({ description: 'Contact message not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async markAsRead(
    @Param('id') id: string,
    @Body('read') read?: boolean,
  ): Promise<ContactMessageResponseDto> {
    const message = await this.contactAdminService.markMessageAsRead(
      id,
      read ?? true,
    );
    return message as unknown as ContactMessageResponseDto;
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a contact message by MongoDB ObjectId' })
  @ApiParam({ name: 'id', example: '66fa3b5a9c1e7a001f3e9a11' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Contact message not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async deleteMessage(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.contactAdminService.deleteMessage(id);
  }
}

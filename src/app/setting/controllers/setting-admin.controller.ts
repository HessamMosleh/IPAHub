import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { SettingAdminService } from '../services/setting-admin.service';
import { SaveSiteSettingsDto } from '../dtos/save-site-settings.dto';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';
import { SingleSettingResponseDto } from '../dtos/single-setting-response.dto';
import { UpdateSingleSettingDto } from '../dtos/update-single-setting.dto';
import { MemberSettingsMapResponseDto } from '../dtos/member-setting-response.dto';

/**
 * Administrative Setting Controller.
 * Segregated from client controller (SRP).
 * Guarded with JWT and Roles guards (SUPER_ADMIN and ADMIN).
 */
@ApiTags('Admin - Setting')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/setting')
export class SettingAdminController {
  constructor(private readonly settingAdminService: SettingAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all site settings for administration' })
  @ApiOkResponse({
    type: SiteSettingsResponseDto,
    description: 'Current site settings.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAllSiteSettings(): Promise<SiteSettingsResponseDto> {
    return this.settingAdminService.getSiteSettings();
  }

  @Get('site')
  @ApiOperation({ summary: 'Get all site settings' })
  @ApiOkResponse({
    type: SiteSettingsResponseDto,
    description: 'Current site settings.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getSiteSettings(): Promise<SiteSettingsResponseDto> {
    return this.settingAdminService.getSiteSettings();
  }

  @Put('site')
  @ApiOperation({
    summary:
      'Update site settings in bulk with validation and normalization of social URLs',
  })
  @ApiOkResponse({
    type: SiteSettingsResponseDto,
    description: 'The updated site settings.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid social links or formatting error.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async saveSiteSettings(
    @Body() dto: SaveSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    return this.settingAdminService.saveSiteSettings(dto);
  }

  @Get('site/:key')
  @ApiOperation({ summary: 'Get single site setting by key' })
  @ApiParam({ name: 'key', example: 'associationName' })
  @ApiOkResponse({
    type: SingleSettingResponseDto,
    description: 'The site setting details.',
  })
  @ApiNotFoundResponse({ description: 'Setting not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getSiteSetting(
    @Param('key') key: string,
  ): Promise<SingleSettingResponseDto> {
    const value = await this.settingAdminService.getSiteSetting(key);
    return { key, value: value ?? '' };
  }

  @Put('site/:key')
  @ApiOperation({ summary: 'Update or set a single site setting' })
  @ApiParam({ name: 'key', example: 'associationName' })
  @ApiOkResponse({
    type: SingleSettingResponseDto,
    description: 'The updated site setting.',
  })
  @ApiBadRequestResponse({ description: 'Invalid value format.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async setSiteSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSingleSettingDto,
  ): Promise<SingleSettingResponseDto> {
    return this.settingAdminService.setSiteSetting(key, dto.value);
  }

  @Get('member')
  @ApiOperation({ summary: 'Get all member workflow settings' })
  @ApiOkResponse({
    type: MemberSettingsMapResponseDto,
    description: 'Member settings dictionary.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getMemberSettings(): Promise<MemberSettingsMapResponseDto> {
    const settings = await this.settingAdminService.getMemberSettings();
    return { settings };
  }

  @Get('member/:key')
  @ApiOperation({ summary: 'Get single member setting by key' })
  @ApiParam({ name: 'key', example: 'membershipNoSeq' })
  @ApiOkResponse({
    type: SingleSettingResponseDto,
    description: 'The member setting details.',
  })
  @ApiNotFoundResponse({ description: 'Setting not found.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getMemberSetting(
    @Param('key') key: string,
  ): Promise<SingleSettingResponseDto> {
    const value = await this.settingAdminService.getMemberSetting(key);
    return { key, value: value ?? '' };
  }

  @Put('member/:key')
  @ApiOperation({ summary: 'Update or set a single member setting' })
  @ApiParam({ name: 'key', example: 'membershipNoSeq' })
  @ApiOkResponse({
    type: SingleSettingResponseDto,
    description: 'The updated member setting.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async setMemberSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSingleSettingDto,
  ): Promise<SingleSettingResponseDto> {
    return this.settingAdminService.setMemberSetting(key, dto.value);
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Idempotently seed default site and member settings',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        seededSite: { type: 'number', example: 6 },
        seededMember: { type: 'number', example: 1 },
        total: { type: 'number', example: 7 },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async seed(): Promise<{
    seededSite: number;
    seededMember: number;
    total: number;
  }> {
    return this.settingAdminService.seed();
  }
}

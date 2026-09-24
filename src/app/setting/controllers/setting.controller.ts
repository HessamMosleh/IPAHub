import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SettingService } from '../services/setting.service';
import { SiteSettingsResponseDto } from '../dtos/site-settings-response.dto';
import { SingleSettingResponseDto } from '../dtos/single-setting-response.dto';

/**
 * Public/Client Setting Controller.
 * Adheres to Single Responsibility Principle (SRP) — handles public queries
 * for site-wide settings such as name, logo, and social channels.
 */
@ApiTags('Setting')
@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get site-wide settings (association name, logo, social channels) for public display',
  })
  @ApiOkResponse({
    type: SiteSettingsResponseDto,
    description: 'The public site settings.',
  })
  async getSiteSettings(): Promise<SiteSettingsResponseDto> {
    return this.settingService.getSiteSettings();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a single site setting by key' })
  @ApiParam({
    name: 'key',
    description: 'Setting key name (e.g. associationName, telegram)',
    example: 'associationName',
  })
  @ApiOkResponse({
    type: SingleSettingResponseDto,
    description: 'The setting key-value pair.',
  })
  @ApiNotFoundResponse({ description: 'Setting not found.' })
  async getSiteSetting(
    @Param('key') key: string,
  ): Promise<SingleSettingResponseDto> {
    const value = await this.settingService.getSiteSetting(key);
    return { key, value: value ?? '' };
  }
}

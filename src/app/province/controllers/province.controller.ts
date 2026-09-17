import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ProvinceService } from '../services/province.service';
import { ListProvincesDto } from '../dtos/list-provinces.dto';
import { ProvinceResponseDto } from '../dtos/province-response.dto';

/**
 * Public/Client Province Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users,
 * exposing only active provinces with no administrative mutation capabilities.
 */
@ApiTags('Province')
@Controller('province')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  @ApiOperation({
    summary: 'List all active provinces ordered for map and dropdown pickers',
  })
  @ApiOkResponse({
    type: [ProvinceResponseDto],
    description: 'Active provinces sorted by display order ascending.',
  })
  async findAll(
    @Query() query: ListProvincesDto,
  ): Promise<ProvinceResponseDto[]> {
    const provinces = await this.provinceService.findAllActive(query);
    return provinces as unknown as ProvinceResponseDto[];
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get active province by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Province slug (e.g. tehran-city, fars)',
    example: 'tehran-city',
  })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The active province details.',
  })
  @ApiNotFoundResponse({ description: 'Province not found or inactive.' })
  async findBySlug(@Param('slug') slug: string): Promise<ProvinceResponseDto> {
    const province = await this.provinceService.findBySlug(slug);
    return province as unknown as ProvinceResponseDto;
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get active province by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Province MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: ProvinceResponseDto,
    description: 'The active province details.',
  })
  @ApiNotFoundResponse({ description: 'Province not found or inactive.' })
  async findById(@Param('id') id: string): Promise<ProvinceResponseDto> {
    const province = await this.provinceService.findById(id);
    return province as unknown as ProvinceResponseDto;
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequestTypeService } from '../services/request-type.service';
import { ListRequestTypesDto } from '../dtos/list-request-types.dto';
import {
  ProvinceRequestPriceResponseDto,
  RequestTypeResponseDto,
} from '../dtos/request-type-response.dto';
import { RequestType } from '../request-type.schema';

/**
 * Public/Client Request Type Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users and members,
 * exposing active request types and price calculations with no administrative mutation capabilities.
 */
@ApiTags('Request Type')
@Controller('request-type')
export class RequestTypeController {
  constructor(private readonly requestTypeService: RequestTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List all active request types ordered for selection',
  })
  @ApiOkResponse({
    type: [RequestTypeResponseDto],
    description: 'Active request types sorted by display order ascending.',
  })
  async findAll(
    @Query() query: ListRequestTypesDto,
  ): Promise<RequestTypeResponseDto[]> {
    const types = await this.requestTypeService.findAllActive(query);
    return types.map((t) => this.formatResponse(t, query?.province));
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get active request type by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Request type slug (e.g. membership-card, bank-letter)',
    example: 'membership-card',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Optional member province ID to calculate applicable fee',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'The active request type details.',
  })
  @ApiNotFoundResponse({ description: 'Request type not found or inactive.' })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('province') province?: string,
  ): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeService.findBySlug(slug);
    return this.formatResponse(type, province);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get active request type by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Request type MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Optional member province ID to calculate applicable fee',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: RequestTypeResponseDto,
    description: 'The active request type details.',
  })
  @ApiNotFoundResponse({ description: 'Request type not found or inactive.' })
  async findById(
    @Param('id') id: string,
    @Query('province') province?: string,
  ): Promise<RequestTypeResponseDto> {
    const type = await this.requestTypeService.findById(id);
    return this.formatResponse(type, province);
  }

  private formatResponse(
    doc: RequestType,
    provinceId?: string,
  ): RequestTypeResponseDto {
    const formatted: RequestTypeResponseDto = {
      _id: doc._id ? String(doc._id) : '',
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      baseFee: doc.baseFee ?? 0,
      prices: doc.prices as unknown as ProvinceRequestPriceResponseDto[],
      producesDocument: doc.producesDocument ?? true,
      order: doc.order ?? 0,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    if (provinceId) {
      formatted.applicableFee = this.requestTypeService.resolvePrice(
        doc,
        provinceId,
      );
    }

    return formatted;
  }
}

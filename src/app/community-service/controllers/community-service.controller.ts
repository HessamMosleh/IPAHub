import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CommunityServiceService } from '../services/community-service.service';
import { ListCommunityServicesDto } from '../dtos/list-community-services.dto';
import { CommunityServiceResponseDto } from '../dtos/community-service-response.dto';

/**
 * Public/Client Community Service Controller.
 * Adheres to SRP — handles incoming HTTP queries for public users,
 * exposing community services with no administrative mutation capabilities.
 */
@ApiTags('Community Service')
@Controller('community-service')
export class CommunityServiceController {
  constructor(
    private readonly communityServiceService: CommunityServiceService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List all community services ordered for home page and public listings',
  })
  @ApiOkResponse({
    type: [CommunityServiceResponseDto],
    description: 'Community services sorted by display order ascending.',
  })
  async findAll(
    @Query() query: ListCommunityServicesDto,
  ): Promise<CommunityServiceResponseDto[]> {
    const services = await this.communityServiceService.findAll(query);
    return services as unknown as CommunityServiceResponseDto[];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get community service by MongoDB ObjectId' })
  @ApiParam({
    name: 'id',
    description: 'Community service MongoDB ObjectId',
    example: '66fa3b5a9c1e7a001f3e9a11',
  })
  @ApiOkResponse({
    type: CommunityServiceResponseDto,
    description: 'The community service details.',
  })
  @ApiNotFoundResponse({ description: 'Community service not found.' })
  async findById(
    @Param('id') id: string,
  ): Promise<CommunityServiceResponseDto> {
    const service = await this.communityServiceService.findById(id);
    return service as unknown as CommunityServiceResponseDto;
  }
}

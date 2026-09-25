import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { MediaFileDto } from '../dtos/media-file.dto';
import { translate } from '../utils/translate';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload a file; returns MediaFile metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        visibility: { type: 'string', enum: ['public', 'private'] },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: MediaFileDto })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('visibility') visibility?: 'public' | 'private',
    @Query('prefix') prefix?: string,
  ): Promise<MediaFileDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(translate('errors.FILE_REQUIRED'));
    }
    return this.storage.putObject({
      buffer: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
      originalName: file.originalname,
      prefix: prefix || 'uploads',
      visibility: visibility === 'public' ? 'public' : 'private',
    });
  }

  @Get('file')
  @ApiOperation({
    summary: 'Stream a file by key (public keys unauthenticated; private need JWT)',
  })
  @ApiQuery({ name: 'key', required: true })
  async getFile(
    @Query('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!key) {
      throw new BadRequestException(translate('errors.INVALID_STORAGE_KEY'));
    }
    if (!this.storage.isPublicKey(key)) {
      throw new BadRequestException(translate('errors.INVALID_STORAGE_KEY'));
    }
    const { stream, mimeType, size } = await this.storage.getObject(key);
    if (mimeType) res.setHeader('Content-Type', mimeType);
    if (size != null) res.setHeader('Content-Length', size);
    stream.pipe(res);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('private-file')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Stream a private file by key' })
  @ApiQuery({ name: 'key', required: true })
  async getPrivateFile(
    @Query('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!key) {
      throw new BadRequestException(translate('errors.INVALID_STORAGE_KEY'));
    }
    const { stream, mimeType, size } = await this.storage.getObject(key);
    if (mimeType) res.setHeader('Content-Type', mimeType);
    if (size != null) res.setHeader('Content-Length', size);
    stream.pipe(res);
  }
}

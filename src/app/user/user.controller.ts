import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { UserService } from './user.service';
import { UpdateMemberProfileDto } from './dtos/update-member-profile.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { MemberDocumentKind } from './member-document.schema';
import { StorageService } from '../../common/storage/storage.service';
import { translate } from '../../common/utils/translate';
import { MemberDocumentResponseDto } from './dtos/member-document-response.dto';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storage: StorageService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@GetUser() auth: AuthenticatedUser): Promise<UserResponseDto> {
    const user = await this.userService.findOne({ _id: auth.id });
    return this.userService.toResponse(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile fields' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @GetUser() auth: AuthenticatedUser,
    @Body() dto: UpdateMemberProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateMemberProfile(auth.id, dto);
    return this.userService.toResponse(user);
  }

  @Post('me/photo')
  @ApiOperation({ summary: 'Upload or replace personal photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: UserResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @GetUser() auth: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(translate('errors.FILE_REQUIRED'));
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(translate('errors.FILE_REQUIRED'));
    }
    const media = await this.storage.putObject({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      prefix: 'photos',
      visibility: 'private',
    });
    const user = await this.userService.setPhoto(auth.id, media);
    return this.userService.toResponse(user);
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'List current user member documents' })
  @ApiOkResponse({ type: [MemberDocumentResponseDto] })
  async listDocuments(
    @GetUser() auth: AuthenticatedUser,
  ): Promise<MemberDocumentResponseDto[]> {
    return this.userService.listDocuments(auth.id);
  }

  @Post('me/documents/:kind')
  @ApiOperation({ summary: 'Upload a member document by kind' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ type: MemberDocumentResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @GetUser() auth: AuthenticatedUser,
    @Param('kind') kind: MemberDocumentKind,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<MemberDocumentResponseDto> {
    if (!Object.values(MemberDocumentKind).includes(kind)) {
      throw new BadRequestException(translate('errors.INVALID_DOCUMENT_KIND'));
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException(translate('errors.FILE_REQUIRED'));
    }
    const media = await this.storage.putObject({
      buffer: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
      originalName: file.originalname,
      prefix: 'documents',
      visibility: 'private',
    });
    return this.userService.upsertDocument(auth.id, kind, media);
  }

  @Delete('me/documents/:kind')
  @ApiOperation({ summary: 'Delete a member document by kind' })
  async deleteDocument(
    @GetUser() auth: AuthenticatedUser,
    @Param('kind') kind: MemberDocumentKind,
  ): Promise<{ deleted: true }> {
    await this.userService.deleteDocument(auth.id, kind);
    return { deleted: true };
  }

  @Get('me/documents/:kind/download')
  @ApiOperation({ summary: 'Download a member document' })
  async downloadDocument(
    @GetUser() auth: AuthenticatedUser,
    @Param('kind') kind: MemberDocumentKind,
    @Res() res: Response,
  ): Promise<void> {
    const doc = await this.userService.getDocument(auth.id, kind);
    const { stream, mimeType, size } = await this.storage.getObject(
      doc.file.key,
    );
    if (mimeType || doc.file.mimeType) {
      res.setHeader('Content-Type', mimeType || doc.file.mimeType!);
    }
    if (size != null) res.setHeader('Content-Length', size);
    if (doc.file.originalName) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${doc.file.originalName}"`,
      );
    }
    stream.pipe(res);
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Client as MinioClient } from 'minio';
import { MediaFile } from '../schemas/media-file.schema';
import { translate } from '../utils/translate';

export type StorageVisibility = 'public' | 'private';

export interface PutObjectInput {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  /** Logical folder prefix, e.g. `photos` or `documents`. */
  prefix?: string;
  visibility?: StorageVisibility;
  width?: number;
  height?: number;
}

/**
 * Object storage for MediaFile keys, backed by MinIO (S3-compatible).
 *
 * Keys stay stable as `public/...` / `private/...` so callers and stored
 * MediaFile metadata do not need to change when swapping backends.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: MinioClient;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endPoint = this.config.getOrThrow<string>('MINIO_ENDPOINT');
    const port = Number(this.config.get('MINIO_PORT') ?? 9000);
    const useSSL = this.parseBool(this.config.get('MINIO_USE_SSL'), false);
    const accessKey = this.config.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretKey = this.config.getOrThrow<string>('MINIO_SECRET_KEY');
    this.bucket = this.config.getOrThrow<string>('MINIO_BUCKET');

    this.client = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }

    this.logger.log(
      `MinIO storage ready: ${endPoint}:${port}/${this.bucket} (ssl=${useSSL})`,
    );
  }

  async putObject(input: PutObjectInput): Promise<MediaFile> {
    const visibility = input.visibility ?? 'private';
    const ext =
      path.extname(input.originalName || '') ||
      this.extFromMime(input.mimeType);
    const folder = (input.prefix || 'files').replace(/\/+$/, '');
    const key = `${visibility}/${folder}/${randomUUID()}${ext}`;

    this.assertSafeKey(key);

    await this.client.putObject(
      this.bucket,
      key,
      input.buffer,
      input.buffer.length,
      { 'Content-Type': input.mimeType },
    );

    return {
      key,
      mimeType: input.mimeType,
      size: input.buffer.length,
      originalName: input.originalName,
      width: input.width,
      height: input.height,
      uploadedAt: new Date(),
    };
  }

  async getObject(key: string): Promise<{
    stream: NodeJS.ReadableStream;
    mimeType?: string;
    size?: number;
  }> {
    this.assertSafeKey(key);
    try {
      const [stat, stream] = await Promise.all([
        this.client.statObject(this.bucket, key),
        this.client.getObject(this.bucket, key),
      ]);
      const mimeType =
        stat.metaData?.['content-type'] ||
        stat.metaData?.['Content-Type'];
      return {
        stream,
        mimeType,
        size: stat.size,
      };
    } catch (err) {
      this.rethrowNotFound(err);
    }
  }

  async getBuffer(key: string): Promise<Buffer> {
    this.assertSafeKey(key);
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      this.rethrowNotFound(err);
    }
  }

  async deleteObject(key: string): Promise<void> {
    this.assertSafeKey(key);
    await this.client.removeObject(this.bucket, key).catch(() => undefined);
  }

  isPublicKey(key: string): boolean {
    return key.startsWith('public/');
  }

  assertSafeKey(key: string): void {
    if (
      !key?.trim() ||
      key.includes('..') ||
      key.startsWith('/') ||
      key.includes('\\') ||
      path.isAbsolute(key)
    ) {
      throw new BadRequestException(translate('errors.INVALID_STORAGE_KEY'));
    }
  }

  private rethrowNotFound(err: unknown): never {
    if (this.isNotFound(err)) {
      throw new NotFoundException(translate('errors.FILE_NOT_FOUND'));
    }
    throw err;
  }

  private isNotFound(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { code?: string; statusCode?: number };
    return (
      e.code === 'NoSuchKey' ||
      e.code === 'NotFound' ||
      e.statusCode === 404
    );
  }

  private parseBool(
    value: string | boolean | undefined,
    fallback: boolean,
  ): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return fallback;
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mime] || '';
  }
}

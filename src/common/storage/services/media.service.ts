import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { StorageService } from './storage.service';
import { MediaUpload, MediaUploadStatus } from '../media-upload.schema';
import { translate } from '../../utils/translate';

/** How long an upload may stay unclaimed before it is swept. */
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_BATCH = 200;

type MediaRef = { key?: string | null } | string | null | undefined;

/** Keys referenced by the given media fields, skipping empty ones. */
export function mediaKeys(...refs: MediaRef[]): string[] {
  const keys = refs
    .map((ref) => (typeof ref === 'string' ? ref : ref?.key)?.trim())
    .filter((key): key is string => !!key);
  return [...new Set(keys)];
}

export interface MediaChange {
  /** Keys the owner references once the save succeeds. */
  next: string[];
  /** Keys the owner referenced before the save. */
  previous?: string[];
}

/**
 * Ties objects uploaded through `POST /storage/upload` to the documents that
 * embed them, so MinIO does not accumulate orphans.
 *
 * - `commit` claims newly referenced keys before the owner is saved, reverts
 *   the claim if the save throws, and releases keys the owner dropped.
 * - `release` deletes objects whose owner was deleted.
 * - Uploads never claimed within {@link PENDING_TTL_MS} are swept hourly.
 *
 * Keys without a ledger row (seed assets, server-written files, and objects
 * uploaded before the ledger existed) are never deleted by this service.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(MediaUpload.name)
    private readonly mediaUploadModel: Model<MediaUpload>,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'sweep-pending-media' })
  async handleSweepPending(): Promise<void> {
    await this.sweepPending();
  }

  async recordUpload(key: string, uploadedBy?: string): Promise<void> {
    await this.mediaUploadModel.create({
      key,
      status: MediaUploadStatus.PENDING,
      uploadedBy:
        uploadedBy && isValidObjectId(uploadedBy)
          ? new Types.ObjectId(uploadedBy)
          : undefined,
    });
  }

  async commit<T>(change: MediaChange, save: () => Promise<T>): Promise<T> {
    const next = new Set(change.next);
    const previous = new Set(change.previous ?? []);
    const added = [...next].filter((key) => !previous.has(key));
    const removed = [...previous].filter((key) => !next.has(key));

    await this.claim(added);

    let result: T;
    try {
      result = await save();
    } catch (err) {
      await this.unclaim(added);
      throw err;
    }

    await this.release(removed);
    return result;
  }

  /** Best-effort: never throws, so a MinIO outage cannot fail the caller. */
  async release(keys: string[]): Promise<void> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (!unique.length) return;

    try {
      const rows = await this.mediaUploadModel
        .find({ key: { $in: unique }, status: MediaUploadStatus.ATTACHED })
        .select('key')
        .exec();

      for (const row of rows) {
        try {
          await this.storage.removeObject(row.key);
          await this.mediaUploadModel.deleteOne({ _id: row._id }).exec();
        } catch (err) {
          this.logger.warn(
            `Failed to release media ${row.key}: ${String(err)}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to release media: ${String(err)}`);
    }
  }

  async sweepPending(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - PENDING_TTL_MS);
    let swept = 0;

    try {
      const stale = await this.mediaUploadModel
        .find({ status: MediaUploadStatus.PENDING, updatedAt: { $lt: cutoff } })
        .select('key')
        .limit(SWEEP_BATCH)
        .exec();

      for (const { key } of stale) {
        // Deleting the row first stops a concurrent `claim` from attaching an
        // object that is about to disappear.
        const row = await this.mediaUploadModel
          .findOneAndDelete({ key, status: MediaUploadStatus.PENDING })
          .exec();
        if (!row) continue;

        try {
          await this.storage.removeObject(key);
          swept++;
        } catch (err) {
          await this.mediaUploadModel
            .create({ key, status: MediaUploadStatus.PENDING })
            .catch(() => undefined);
          this.logger.warn(`Failed to sweep media ${key}: ${String(err)}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Media sweep failed: ${String(err)}`);
    }

    if (swept) this.logger.log(`Swept ${swept} unclaimed upload(s)`);
    return swept;
  }

  private async claim(keys: string[]): Promise<void> {
    const claimed: string[] = [];
    for (const key of keys) {
      const row = await this.mediaUploadModel
        .findOneAndUpdate(
          { key, status: MediaUploadStatus.PENDING },
          { $set: { status: MediaUploadStatus.ATTACHED } },
        )
        .exec();
      if (!row) {
        await this.unclaim(claimed);
        throw new BadRequestException(translate('errors.MEDIA_NOT_UPLOADED'));
      }
      claimed.push(key);
    }
  }

  private async unclaim(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.mediaUploadModel
      .updateMany(
        { key: { $in: keys }, status: MediaUploadStatus.ATTACHED },
        { $set: { status: MediaUploadStatus.PENDING } },
      )
      .exec()
      .catch((err: unknown) =>
        this.logger.warn(`Failed to unclaim media: ${String(err)}`),
      );
  }
}

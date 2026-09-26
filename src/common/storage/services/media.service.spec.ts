import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { MediaService, mediaKeys } from './media.service';
import { MediaUpload, MediaUploadStatus } from '../media-upload.schema';
import { StorageService } from './storage.service';

const exec = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

const buildModelMock = () => ({
  create: jest.fn().mockResolvedValue({}),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateMany: jest.fn().mockReturnValue(exec({ modifiedCount: 0 })),
  deleteOne: jest.fn().mockReturnValue(exec({ deletedCount: 1 })),
});

const findChain = <T>(rows: T[]) => {
  const chain = {
    select: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(rows),
  };
  chain.select.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
};

describe('MediaService', () => {
  let service: MediaService;
  let model: ReturnType<typeof buildModelMock>;
  let storage: { removeObject: jest.Mock };

  beforeEach(async () => {
    model = buildModelMock();
    storage = { removeObject: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getModelToken(MediaUpload.name), useValue: model },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  describe('mediaKeys', () => {
    it('collects trimmed, unique, non-empty keys from files and strings', () => {
      expect(
        mediaKeys({ key: ' a ' }, undefined, null, { key: '' }, 'b', 'a'),
      ).toEqual(['a', 'b']);
    });
  });

  describe('recordUpload', () => {
    it('stores a PENDING row with the uploader', async () => {
      await service.recordUpload(
        'public/uploads/x.png',
        '507f1f77bcf86cd799439011',
      );

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'public/uploads/x.png',
          status: MediaUploadStatus.PENDING,
        }),
      );
    });
  });

  describe('commit', () => {
    it('claims added keys, saves, then releases dropped keys', async () => {
      model.findOneAndUpdate.mockReturnValue(exec({ key: 'new' }));
      model.find.mockReturnValue(findChain([{ _id: 'row-old', key: 'old' }]));
      const save = jest.fn().mockResolvedValue('saved');

      const result = await service.commit(
        { next: ['new', 'kept'], previous: ['old', 'kept'] },
        save,
      );

      expect(result).toBe('saved');
      expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'new', status: MediaUploadStatus.PENDING },
        { $set: { status: MediaUploadStatus.ATTACHED } },
      );
      expect(model.find).toHaveBeenCalledWith({
        key: { $in: ['old'] },
        status: MediaUploadStatus.ATTACHED,
      });
      expect(storage.removeObject).toHaveBeenCalledWith('old');
      expect(model.deleteOne).toHaveBeenCalledWith({ _id: 'row-old' });
    });

    it('rejects a key that was never uploaded and unclaims earlier keys', async () => {
      model.findOneAndUpdate
        .mockReturnValueOnce(exec({ key: 'a' }))
        .mockReturnValueOnce(exec(null));
      const save = jest.fn();

      await expect(service.commit({ next: ['a', 'b'] }, save)).rejects.toThrow(
        BadRequestException,
      );

      expect(save).not.toHaveBeenCalled();
      expect(model.updateMany).toHaveBeenCalledWith(
        { key: { $in: ['a'] }, status: MediaUploadStatus.ATTACHED },
        { $set: { status: MediaUploadStatus.PENDING } },
      );
    });

    it('returns claimed keys to PENDING when the save throws', async () => {
      model.findOneAndUpdate.mockReturnValue(exec({ key: 'a' }));
      const failure = new Error('validation failed');

      await expect(
        service.commit({ next: ['a'] }, () => Promise.reject(failure)),
      ).rejects.toBe(failure);

      expect(model.updateMany).toHaveBeenCalledWith(
        { key: { $in: ['a'] }, status: MediaUploadStatus.ATTACHED },
        { $set: { status: MediaUploadStatus.PENDING } },
      );
      expect(storage.removeObject).not.toHaveBeenCalled();
    });

    it('does not touch the ledger when the keys are unchanged', async () => {
      const save = jest.fn().mockResolvedValue(undefined);

      await service.commit({ next: ['a'], previous: ['a'] }, save);

      expect(save).toHaveBeenCalled();
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
      expect(model.find).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('keeps the ledger row when MinIO fails, and never throws', async () => {
      model.find.mockReturnValue(findChain([{ _id: 'r1', key: 'k1' }]));
      storage.removeObject.mockRejectedValue(new Error('minio down'));

      await expect(service.release(['k1'])).resolves.toBeUndefined();

      expect(model.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('sweepPending', () => {
    it('deletes stale PENDING uploads and their objects', async () => {
      const now = new Date('2026-09-27T12:00:00Z');
      model.find.mockReturnValue(findChain([{ key: 'k1' }, { key: 'k2' }]));
      model.findOneAndDelete
        .mockReturnValueOnce(exec({ key: 'k1' }))
        .mockReturnValueOnce(exec(null));

      const swept = await service.sweepPending(now);

      expect(model.find).toHaveBeenCalledWith({
        status: MediaUploadStatus.PENDING,
        updatedAt: { $lt: new Date('2026-09-26T12:00:00Z') },
      });
      expect(storage.removeObject).toHaveBeenCalledTimes(1);
      expect(storage.removeObject).toHaveBeenCalledWith('k1');
      expect(swept).toBe(1);
    });

    it('restores the row when the object cannot be removed', async () => {
      model.find.mockReturnValue(findChain([{ key: 'k1' }]));
      model.findOneAndDelete.mockReturnValue(exec({ key: 'k1' }));
      storage.removeObject.mockRejectedValue(new Error('minio down'));

      const swept = await service.sweepPending();

      expect(swept).toBe(0);
      expect(model.create).toHaveBeenCalledWith({
        key: 'k1',
        status: MediaUploadStatus.PENDING,
      });
    });
  });
});

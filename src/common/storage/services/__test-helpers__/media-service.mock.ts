import { MediaChange } from '../media.service';

export const buildMediaServiceMock = () => ({
  recordUpload: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn(<T>(_change: MediaChange, save: () => Promise<T>) => save()),
  release: jest.fn().mockResolvedValue(undefined),
  sweepPending: jest.fn().mockResolvedValue(0),
});

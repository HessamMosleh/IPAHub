import { Types } from 'mongoose';
import { ActiveStatus } from '../../../../common/enums/active-status.enum';

export const FIXED_GALLERY_ID = '507f1f77bcf86cd799439011';
export const FIXED_GALLERY_ID_2 = '507f1f77bcf86cd799439022';
export const FIXED_GALLERY_ID_3 = '507f1f77bcf86cd799439033';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface GalleryImageFixtureOverrides {
  _id?: string;
  image?: {
    key: string;
    mimeType?: string;
    size?: number;
    originalName?: string;
    width?: number;
    height?: number;
    uploadedAt?: Date;
  };
  caption?: { en: string; fa?: string };
  order?: number;
  status?: ActiveStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GalleryImageLike = {
  _id?: any;
  image: {
    key: string;
    mimeType?: string;
    size?: number;
    originalName?: string;
    width?: number;
    height?: number;
    uploadedAt?: Date;
  };
  caption?: { en: string; fa?: string };
  order: number;
  status: ActiveStatus;
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildGalleryImage = (
  overrides: GalleryImageFixtureOverrides = {},
): GalleryImageLike => ({
  _id: FIXED_GALLERY_ID,
  image: {
    key: 'seed/banner-association.svg',
    originalName: 'banner-association.svg',
    mimeType: 'image/svg+xml',
    uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  caption: {
    en: 'Industrial Consultants Association',
    fa: 'انجمن مشاوران صنعتی',
  },
  order: 0,
  status: ActiveStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export type QueryChain = {
  select: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain = {
    select: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.exec.mockResolvedValue(resolvedValue);
  return chain;
};

export const buildGalleryImageModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

export const buildCreateGalleryImageDto = (
  overrides: Record<string, any> = {},
) => ({
  image: {
    key: 'gallery/banner-1.jpg',
    mimeType: 'image/jpeg',
    size: 102400,
    originalName: 'banner-1.jpg',
  },
  caption: {
    en: 'Banner title',
    fa: 'عنوان بنر',
  },
  ...overrides,
});

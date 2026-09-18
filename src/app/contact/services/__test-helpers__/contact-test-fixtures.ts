import { Types } from 'mongoose';

export const FIXED_CONTACT_INFO_ID = '507f1f77bcf86cd799439011';
export const FIXED_MESSAGE_ID = '507f1f77bcf86cd799439022';
export const FIXED_MESSAGE_ID_2 = '507f1f77bcf86cd799439033';

export const newObjectId = (): string => new Types.ObjectId().toString();

export interface ContactInfoFixtureOverrides {
  _id?: string;
  key?: string;
  address?: { en: string; fa?: string };
  phone?: string;
  email?: string;
  socials?: {
    telegram?: string;
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export type ContactInfoLike = {
  _id?: any;
  key: string;
  address: { en: string; fa?: string };
  phone: string;
  email: string;
  socials?: {
    telegram?: string;
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildContactInfo = (
  overrides: ContactInfoFixtureOverrides = {},
): ContactInfoLike => ({
  _id: FIXED_CONTACT_INFO_ID,
  key: 'main',
  address: {
    en: 'No. 12, Consulting Engineers Building, Vali-e-Asr Ave., Tehran, Iran',
    fa: 'تهران، خیابان ولیعصر، ساختمان مهندسان مشاور، پلاک ۱۲',
  },
  phone: '+98 21 8888 0000',
  email: 'info@ipa.example',
  socials: {
    telegram: 'https://t.me/ipa_example',
    instagram: 'https://instagram.com/ipa_example',
    whatsapp: 'https://wa.me/982188880000',
    facebook: 'https://facebook.com/ipa_example',
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export interface ContactMessageFixtureOverrides {
  _id?: string;
  name?: string;
  email?: string;
  message?: string;
  read?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ContactMessageLike = {
  _id?: any;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  save?: jest.Mock;
};

export const buildContactMessage = (
  overrides: ContactMessageFixtureOverrides = {},
): ContactMessageLike => ({
  _id: FIXED_MESSAGE_ID,
  name: 'Ali Rezaei',
  email: 'ali.rezaei@example.com',
  message: 'Hello, I have an inquiry.',
  read: false,
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

export const buildContactInfoModelMock = () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
});

export const buildContactMessageModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
});

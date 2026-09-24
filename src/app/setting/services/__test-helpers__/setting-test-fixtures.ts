export type QueryChain = {
  select: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

export const buildQueryChain = <T>(resolvedValue: T): QueryChain => {
  const chain: QueryChain = {
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

export interface MockSiteSettingDoc {
  _id: string;
  key: string;
  value: string;
  save: jest.Mock;
}

export const buildSiteSettingDoc = (
  overrides: Partial<MockSiteSettingDoc> = {},
): MockSiteSettingDoc => {
  const doc: MockSiteSettingDoc = {
    _id: '66fa3b5a9c1e7a001f3e9a11',
    key: 'associationName',
    value: 'Iranian Petroleum Consultants Association',
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export interface MockMemberSettingDoc {
  _id: string;
  key: string;
  value: string;
  save: jest.Mock;
}

export const buildMemberSettingDoc = (
  overrides: Partial<MockMemberSettingDoc> = {},
): MockMemberSettingDoc => {
  const doc: MockMemberSettingDoc = {
    _id: '66fa3b5a9c1e7a001f3e9a22',
    key: 'membershipNoSeq',
    value: '1000',
    save: jest.fn(),
    ...overrides,
  };
  doc.save.mockResolvedValue(doc);
  return doc;
};

export const buildSettingModelMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
});

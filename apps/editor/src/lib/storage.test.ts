import { getTilesetStorage, resetStorageInstance } from './storage';

// Mock the storage package
jest.mock('@packages/storage', () => {
  const InMemoryTilesetStorageMock = jest.fn().mockImplementation(() => ({}));
  const AzureTilesetStorageMock = jest.fn().mockImplementation(() => ({}));
  
  return {
    InMemoryTilesetStorage: InMemoryTilesetStorageMock,
    AzureTilesetStorage: AzureTilesetStorageMock,
    parseAzureStorageConfigFromEnv: jest.fn(),
  };
});

const { InMemoryTilesetStorage, AzureTilesetStorage } = require('@packages/storage');

describe('Storage Bootstrap', () => {
  beforeEach(() => {
    resetStorageInstance();
    jest.clearAllMocks();
  });

  it('should return InMemoryTilesetStorage in test environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const storage = getTilesetStorage();

    expect(storage).toBeDefined();
    expect(InMemoryTilesetStorage).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should return InMemoryTilesetStorage when USE_IN_MEMORY_STORAGE is true', () => {
    const originalEnv = process.env.USE_IN_MEMORY_STORAGE;
    process.env.USE_IN_MEMORY_STORAGE = 'true';
    process.env.NODE_ENV = 'development';

    const storage = getTilesetStorage();

    expect(storage).toBeDefined();
    expect(InMemoryTilesetStorage).toHaveBeenCalled();

    if (originalEnv) {
      process.env.USE_IN_MEMORY_STORAGE = originalEnv;
    } else {
      delete process.env.USE_IN_MEMORY_STORAGE;
    }
  });

  it('should return AzureTilesetStorage when Azure config is available', () => {
    const { parseAzureStorageConfigFromEnv } = require('@packages/storage');
    parseAzureStorageConfigFromEnv.mockReturnValue({
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;',
      containerName: 'tilesets',
    });

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.USE_IN_MEMORY_STORAGE;

    resetStorageInstance();
    const storage = getTilesetStorage();

    expect(storage).toBeDefined();
    expect(parseAzureStorageConfigFromEnv).toHaveBeenCalled();
    expect(AzureTilesetStorage).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should fall back to InMemoryTilesetStorage when Azure config fails', () => {
    const { parseAzureStorageConfigFromEnv } = require('@packages/storage');
    parseAzureStorageConfigFromEnv.mockImplementation(() => {
      throw new Error('Azure config not available');
    });

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.USE_IN_MEMORY_STORAGE;

    resetStorageInstance();
    const storage = getTilesetStorage();

    expect(storage).toBeDefined();
    expect(parseAzureStorageConfigFromEnv).toHaveBeenCalled();
    expect(InMemoryTilesetStorage).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should return the same instance on subsequent calls', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const storage1 = getTilesetStorage();
    const storage2 = getTilesetStorage();

    expect(storage1).toBe(storage2);

    process.env.NODE_ENV = originalEnv;
  });
});


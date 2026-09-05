import * as os from 'node:os';
import { MongoClient, type MongoClientOptions } from 'mongodb';

/**
 * Driver 7 loads the OS adapter with `import('os')`. Jest (and some bundlers)
 * swallow that dynamic import, so handshake metadata is empty and MongoDB 7
 * rejects the connection. Passing `os` keeps the constructor synchronous.
 */
const defaultOptions: MongoClientOptions = {
  runtimeAdapters: { os },
};

export function createMongoClient(
  uri: string,
  options: MongoClientOptions = {},
): MongoClient {
  return new MongoClient(uri, {
    ...defaultOptions,
    ...options,
    runtimeAdapters: {
      os,
      ...options.runtimeAdapters,
    },
  });
}

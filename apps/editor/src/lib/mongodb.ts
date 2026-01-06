// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

declare global {
  var __ATLAS_URI__: string | undefined;
  var __ATLAS_DATABASE_NAME__: string | undefined;
}

const uri =
  process.env.NODE_ENV === 'test'
    ? globalThis.__ATLAS_URI__
    : process.env.ATLAS_URI;
const dbName =
  process.env.NODE_ENV === 'test'
    ? globalThis.__ATLAS_DATABASE_NAME__
    : process.env.ATLAS_DATABASE_NAME;

if (!uri) {
  throw new Error(
    'Please define the ATLAS_URI environment variable inside .env.local',
  );
}

if (!dbName) {
  throw new Error(
    'Please define the ATLAS_DATABASE_NAME environment variable inside .env.local',
  );
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri!, {});
  /* eslint-disable no-await-in-loop */
  let retries = 3;
  while (retries > 0) {
    try {
      await client.connect();
      break;
    } catch (err) {
      retries -= 1;
      console.error(
        `MongoDB connection attempt failed. Retries left: ${retries}`,
        err,
      );
      if (retries === 0) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function closeDatabaseConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

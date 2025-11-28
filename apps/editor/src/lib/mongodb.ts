// lib/mongodb.ts
import { MongoClient, Db } from 'mongodb';

declare global {
  var __MONGO_URI__: string | undefined;
  var __MONGO_DB_NAME__: string | undefined;
}

const uri = process.env.NODE_ENV === 'test' ? globalThis.__MONGO_URI__ : process.env.MONGODB_URI;
const dbName = process.env.NODE_ENV === 'test' ? globalThis.__MONGO_DB_NAME__ : process.env.MONGODB_DB;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

if (!dbName) {
  throw new Error('Please define the MONGODB_DB environment variable inside .env.local');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri!);
  await client.connect();
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
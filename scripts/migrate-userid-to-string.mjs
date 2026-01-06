/**
 * Migration Script: Convert userId from ObjectId to String
 * 
 * This script converts any userId fields stored as ObjectId to string format.
 * Run this once to fix existing data.
 * 
 * Usage: node scripts/migrate-userid-to-string.mjs
 */

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from apps/editor/.env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'apps', 'editor', '.env.local');

config({ path: envPath });

const uri = process.env.ATLAS_URI || process.env.MONGODB_URI;
const dbName = process.env.ATLAS_DATABASE_NAME || process.env.MONGODB_DB;

if (!uri || !dbName) {
  console.error('❌ Missing database configuration');
  console.error('Please ensure ATLAS_URI and ATLAS_DATABASE_NAME are set in apps/editor/.env.local');
  process.exit(1);
}

console.log('📦 Connecting to database...');
console.log('Database:', dbName);

async function migrateUserIds() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const projectsCollection = db.collection('projects');
    
    // Find all projects
    const projects = await projectsCollection.find({}).toArray();
    console.log(`📊 Found ${projects.length} projects\n`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const project of projects) {
      if (project.userId instanceof ObjectId) {
        // Convert ObjectId to string
        const userIdString = project.userId.toHexString();
        
        await projectsCollection.updateOne(
          { _id: project._id },
          { $set: { userId: userIdString } }
        );
        
        console.log(`✓ Migrated project ${project._id}: ${project.userId} -> ${userIdString}`);
        migrated++;
      } else if (typeof project.userId === 'string') {
        console.log(`- Skipped project ${project._id}: already string (${project.userId})`);
        skipped++;
      } else if (!project.userId) {
        console.log(`⚠ Warning: project ${project._id} (${project.name}) has no userId`);
        skipped++;
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${projects.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

migrateUserIds();

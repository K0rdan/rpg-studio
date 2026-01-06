# Migration: Convert userId from ObjectId to String

## Problem
Your projects have `userId` stored as `ObjectId` instead of `string`, so the query doesn't match.

## Solution Options

### Option 1: Run Migration Script (Recommended)

1. **Ensure your `.env.local` has correct values:**
   ```bash
   # apps/editor/.env.local
   ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/
   ATLAS_DATABASE_NAME=rpg-studio
   ```

2. **Run the migration:**
   ```bash
   node scripts/migrate-userid-to-string.mjs
   ```

### Option 2: Manual MongoDB Query

If the script doesn't work, you can run this directly in MongoDB Compass or Atlas:

```javascript
// Connect to your database, then run:

// 1. Find projects with ObjectId userId
db.projects.find({ userId: { $type: "objectId" } })

// 2. Convert all ObjectId userId to string
db.projects.find({ userId: { $type: "objectId" } }).forEach(function(doc) {
  db.projects.updateOne(
    { _id: doc._id },
    { $set: { userId: doc.userId.toString() } }
  );
  print("Migrated project: " + doc._id + " userId: " + doc.userId);
});

// 3. Verify all are now strings
db.projects.find({ userId: { $type: "objectId" } }).count() // Should be 0
db.projects.find({ userId: { $type: "string" } }).count()   // Should match total
```

### Option 3: Quick Fix in MongoDB Atlas UI

1. Go to MongoDB Atlas → Browse Collections
2. Find your `projects` collection
3. For each project with ObjectId userId:
   - Click Edit
   - Change `userId` from ObjectId to String
   - Copy the hex value (e.g., `69517675d5928c48fff62c1d`)
   - Save

## Verification

After migration, refresh `/projects` page. You should see:
```
Server  Found projects: X for user: 69517675d5928c48fff62c1d
```
Where X > 0 (your actual project count).

## Why This Happened

When projects were created before the ObjectId pattern was established, some code might have stored `userId` as ObjectId. The pattern now requires all foreign keys (like `userId`) to be stored as strings.

See `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md` for the full pattern.

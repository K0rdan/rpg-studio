# MongoDB ObjectId vs String: Design Pattern

**Status**: Approved  
**Date**: 2025-12-29  
**Applies to**: All features using MongoDB

## Problem Statement

MongoDB uses `ObjectId` as the native type for `_id` fields, but this type:
- Is not JSON-serializable
- Causes comparison issues when mixed with string IDs from Auth.js sessions
## Decision: Use Strings Everywhere (Except Direct DB Operations)

### Pattern

**Store as ObjectId in MongoDB, work with strings everywhere else.**

```typescript
// ✅ CORRECT PATTERN

// 1. Writing to DB: Convert string to ObjectId
await db.collection('projects').insertOne({
  _id: new ObjectId(),
  name: 'My Project',
  userId: session.user.id,  // Store as string
  maps: [],
});

// 2. Reading from DB: Convert ObjectId to string immediately
const projectDocs = await db.collection('projects').find({}).toArray();
const projects = projectDocs.map((doc) => ({
  ...doc,
  id: doc._id.toHexString(),  // Convert _id to string
}));

// 3. Querying DB: Use ObjectId for _id, string for other fields
const project = await db.collection('projects').findOne({
  _id: new ObjectId(projectId),  // Convert string to ObjectId for _id
  userId: session.user.id,        // Use string directly for userId
});

// 4. Comparing values: Ensure both are strings
const projectUserId = project.userId instanceof ObjectId 
  ? project.userId.toHexString() 
  : project.userId;

if (projectUserId && projectUserId !== userId) {
  // Comparison works correctly
}
```

### Rationale

1. **JSON Serialization**: ObjectId cannot be serialized to JSON, which is required for:
   - API responses
   - React component props
   - Client-side state management

2. **Auth.js Integration**: Auth.js stores user IDs as strings in sessions:
   ```typescript
   session.user.id  // Always a string
   ```
3. **MongoDB Flexibility**: MongoDB can query with either type:
   ```typescript
   // Both work for userId field stored as string
   .find({ userId: 'abc123' })
   .find({ userId: new ObjectId('abc123') })  // Unnecessary conversion
   ```

## Implementation Rules

### Rule 1: Store User-Related IDs as Strings

```typescript
// ✅ CORRECT
interface Project {
  _id: ObjectId;      // MongoDB's native ID
  userId: string;     // Foreign key to User
  name: string;
}

// ❌ WRONG
interface Project {
  _id: ObjectId;
  userId: ObjectId;   // Don't use ObjectId for foreign keys
}
```

### Rule 2: Convert _id Immediately After Reading

```typescript
// ✅ CORRECT
const docs = await db.collection('projects').find({}).toArray();
const projects = docs.map(doc => ({
  ...doc,
  id: doc._id.toHexString(),
}));

// ❌ WRONG
const docs = await db.collection('projects').find({}).toArray();
return docs;  // Returning ObjectId to client
```

### Rule 3: Use ObjectId Only for _id Queries

```typescript
// ✅ CORRECT
const project = await db.collection('projects').findOne({
  _id: new ObjectId(projectId),  // Convert for _id
  userId: session.user.id,        // String for userId
});

// ❌ WRONG
const project = await db.collection('projects').findOne({
  _id: projectId,  // String won't match ObjectId
});
```

### Rule 4: Handle Mixed Types in Comparisons

```typescript
// ✅ CORRECT - Defensive comparison
const projectUserId = project.userId instanceof ObjectId 
  ? project.userId.toHexString() 
  : project.userId;

if (projectUserId !== userId) {
  // Safe comparison
}

// ❌ WRONG - Assumes type
if (project.userId !== userId) {
  // Fails if project.userId is ObjectId
}
```

## Migration Strategy

For existing data that may have ObjectId in userId fields:

```typescript
// One-time migration script
const projects = await db.collection('projects').find({}).toArray();

for (const project of projects) {
  if (project.userId instanceof ObjectId) {
    await db.collection('projects').updateOne(
      { _id: project._id },
      { $set: { userId: project.userId.toHexString() } }
    );
  }
}
```

## Type Definitions

```typescript
// @packages/types/src/project.ts
export interface GameProject {
  id: string;           // Hex string representation
  name: string;
  userId: string;       // Always string, never ObjectId
  maps: string[];       // Array of hex strings
  characters: string[]; // Array of hex strings
  tilesets?: string[];  // Array of hex strings
}

// Database document type (internal use only)
interface ProjectDocument {
  _id: ObjectId;        // MongoDB native ID
  name: string;
  userId: string;       // Stored as string
  maps: string[];
  characters: string[];
  tilesets?: string[];
}
```

## Testing Pattern

```typescript
// In tests, use string IDs
const userId = 'test-user-123';
const projectId = new ObjectId().toHexString();

await db.collection('projects').insertOne({
  _id: new ObjectId(projectId),
  userId: userId,  // String
  name: 'Test Project',
});

// Mock auth to return string
mockedAuth.mockResolvedValue({ 
  user: { id: userId }  // String
});
```

## Common Pitfalls

### ❌ Pitfall 1: Storing ObjectId in userId
```typescript
// WRONG
await db.collection('projects').insertOne({
  userId: new ObjectId(session.user.id),  // Don't do this
});
```

### ❌ Pitfall 2: Comparing without type checking
```typescript
// WRONG
if (project.userId !== userId) {
  // Fails if types don't match
}
```

### ❌ Pitfall 3: Returning ObjectId to client
```typescript
// WRONG
return NextResponse.json(projectDoc);  // Contains ObjectId
```

## Summary

- **Store**: `_id` as ObjectId, foreign keys as strings
- **Query**: Convert strings to ObjectId only for `_id` field
- **Return**: Always convert ObjectId to string before sending to client
- **Compare**: Ensure both values are strings before comparison
- **Types**: Use `string` in TypeScript interfaces, never `ObjectId`

This pattern ensures consistency, type safety, and compatibility across the entire application stack.

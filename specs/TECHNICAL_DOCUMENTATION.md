# RPG Studio Editor - Technical Documentation

**Version**: 1.0  
**Last Updated**: 2026-01-05

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Patterns](#design-patterns)
3. [Authentication](#authentication)
4. [Routing & Navigation](#routing--navigation)
5. [Database](#database)
6. [Storage](#storage)
7. [Development Guide](#development-guide)
8. [Deployment](#deployment)

---

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Material-UI
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Authentication**: Auth.js (NextAuth.js v5)
- **Storage**: Azure Blob Storage
- **Monorepo**: Turborepo

### Project Structure

```
rpg-studio/
├── apps/
│   ├── editor/          # Next.js editor application
│   ├── player/          # Vite player application
│   └── docs/            # Docusaurus documentation
├── packages/
│   ├── core/            # Game engine (Canvas 2D)
│   ├── types/           # Shared TypeScript types
│   ├── storage/         # Storage abstraction layer
│   └── ui/              # Shared React components
└── specs/               # Feature specifications
```

### Key Principles

1. **Separation of Concerns**: Editor (React) ↔ Engine (Vanilla TS) ↔ Types (Contract)
2. **Type Safety**: All game logic starts with type definitions in `@packages/types`
3. **User Isolation**: All data is scoped to authenticated users
4. **Graceful Degradation**: App continues to function with limited features when services are unavailable

---

## Design Patterns

### MongoDB ObjectId vs String Pattern

**Rule**: Use strings for IDs in application code. Only convert to ObjectId when querying `_id` field.

#### Storage Pattern

```typescript
// ✅ CORRECT
interface Project {
  _id: ObjectId;      // MongoDB's native ID
  userId: string;     // Foreign key - always string
  name: string;
}

// ❌ WRONG
interface Project {
  _id: ObjectId;
  userId: ObjectId;   // Don't use ObjectId for foreign keys
}
```

#### Query Pattern

```typescript
// ✅ CORRECT - Use ObjectId only for _id
const project = await db.collection('projects').findOne({
  _id: new ObjectId(projectId),  // Convert string to ObjectId for _id
  userId: session.user.id,        // Use string directly for userId
});

// ❌ WRONG
const project = await db.collection('projects').findOne({
  _id: projectId,  // String won't match ObjectId
});
```

#### Conversion Pattern

```typescript
// ✅ CORRECT - Convert _id to string immediately after reading
const projectDocs = await db.collection('projects').find({}).toArray();
const projects = projectDocs.map(doc => ({
  ...doc,
  id: doc._id.toHexString(),  // Convert _id to string
}));

// ✅ CORRECT - Handle mixed types in comparisons
const projectUserId = project.userId instanceof ObjectId 
  ? project.userId.toHexString() 
  : project.userId;

if (projectUserId !== userId) {
  // Safe comparison
}
```

**Rationale**:
- JSON serialization (ObjectId can't be sent to clients)
- Auth.js compatibility (sessions use string IDs)
- TypeScript type safety
- Consistency across application layer

**See**: `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md` for complete details

---

## Authentication

### Overview

Authentication is handled by **Auth.js (NextAuth.js v5)** with MongoDB adapter for session persistence.

### Supported Providers

1. **GitHub OAuth**
2. **Google OAuth**
3. **Microsoft Entra ID** (for Outlook/Office 365)
4. **Email Magic Links** (via Brevo SMTP)

### Configuration

#### Environment Variables

```bash
# apps/editor/.env.local

# Auth Secret (generate with: npx auth secret)
AUTH_SECRET=

# GitHub
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Google
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Microsoft
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=common

# Brevo Email (SMTP)
EMAIL_SERVER_HOST=smtp-relay.brevo.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-smtp-key
EMAIL_FROM=no-reply@yourdomain.com
```

### Session Management

Sessions are stored in MongoDB with the following collections:
- `users` - User profiles
- `accounts` - OAuth account links
- `sessions` - Active sessions
- `verification_tokens` - Email verification tokens

### API Protection Pattern

```typescript
// All protected API routes follow this pattern
export async function GET(req: NextRequest) {
  let session = null;
  
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Authentication service unavailable' }, 
      { status: 503 }
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: 'Unauthorized' }, 
      { status: 401 }
    );
  }

  // Protected logic here
}
```

### Error Handling

All `auth()` calls are wrapped in try-catch blocks to handle database connection failures gracefully:

```typescript
let session = null;

try {
  session = await auth();
} catch (error) {
  console.error('[Component] Auth error:', error);
  // Continue with null session - show sign-in UI
}
```

**See**: `specs/007-rpg-editor-auth/` for complete authentication specification

---

## Routing & Navigation

### Route Structure

#### Public Routes
- **`/`** - Landing page
  - Shows welcome message for guests
  - Shows "Go to Projects" button for authenticated users
  - No authentication required

#### Protected Routes
- **`/projects`** - Projects list page
  - **Requires authentication** - redirects to `/` if not logged in
  - Shows all projects belonging to authenticated user
  - Includes "New Project" button

- **`/projects/[projectId]`** - Project detail page
  - **Requires authentication** - API validates ownership
  - Shows project details, maps, characters, tilesets
  - Only accessible by project owner

### Navigation Components

#### Header
- Logo → `/` (home)
- "Projects" button → `/projects` (visible when authenticated)
- User menu with sign out (visible when authenticated)
- "Sign In" button (visible when not authenticated)

### Authentication Flow

```
1. User visits `/` (landing page)
2. Clicks "Sign In" in header
3. Redirected to Auth.js sign-in page
4. Chooses provider (GitHub, Google, Microsoft, or Email)
5. Completes OAuth flow
6. Redirected back to `/`
7. Clicks "Go to Your Projects" → `/projects`
```

### Protected Page Pattern

```typescript
export default async function ProtectedPage() {
  let session = null;
  
  try {
    session = await auth();
  } catch (error) {
    console.error('Auth error:', error);
    redirect('/');
  }
  
  if (!session?.user?.id) {
    redirect('/');
  }

  // Protected content here
}
```

---

## Database

### MongoDB Atlas Configuration

#### Environment Variables

```bash
ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/
ATLAS_DATABASE_NAME=rpg-studio
```

#### Collections

- **`projects`** - Game projects
  - `_id`: ObjectId
  - `userId`: string (owner)
  - `name`: string
  - `maps`: string[]
  - `characters`: string[]
  - `tilesets`: string[]

- **`maps`** - Game maps
  - `_id`: ObjectId
  - `projectId`: string
  - `name`: string
  - `width`: number
  - `height`: number
  - `layers`: Layer[]

- **`tilesets`** - Tileset metadata
  - `_id`: ObjectId
  - `projectId`: string
  - `name`: string
  - `tile_width`: number
  - `tile_height`: number
  - `storageLocation`: string

- **`users`** - User profiles (Auth.js)
- **`accounts`** - OAuth accounts (Auth.js)
- **`sessions`** - Active sessions (Auth.js)

### Connection Handling

```typescript
// Singleton pattern with retry logic
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  
  // Retry logic (3 attempts with 2s delay)
  let retries = 3;
  while (retries > 0) {
    try {
      await client.connect();
      break;
    } catch (err) {
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}
```

---

## Storage

### Azure Blob Storage

#### Configuration

```bash
# Service Principal (Recommended)
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_STORAGE_CONTAINER=assets

# OR Connection String
AZURE_STORAGE_CONNECTION_STRING=
```

#### Storage Path Structure

```
assets/
└── users/
    └── {userId}/
        └── projects/
            └── {projectId}/
                └── tilesets/
                    └── {tilesetId}.png
```

**Example**: `users/69517675d5928c48fff62c1d/projects/abc123/tilesets/tileset1.png`

#### Usage Pattern

```typescript
const storage = getTilesetStorage();

// Upload
const result = await storage.uploadTilesetImage({
  userId: session.user.id,
  projectId: '123',
  tilesetId: 'tileset1',
  mimeType: 'image/png',
  data: buffer,
});

// Get URL (with SAS token)
const url = await storage.getTilesetImageUrl({
  userId: session.user.id,
  projectId: '123',
  tilesetId: 'tileset1',
});
```

**See**: `specs/006-rpg-editor-storage-usage/` for complete storage specification

---

## Development Guide

### Getting Started

```bash
# Install dependencies
npm install

# Start editor in development mode
cd apps/editor
npm run dev

# Run tests
npm test
```

### Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill in required values:
   - MongoDB Atlas connection
   - Auth provider credentials
   - Azure Storage credentials (optional, falls back to in-memory)

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- projects.test.ts

# Run with coverage
npm test -- --coverage
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier (via ESLint)

---

## Deployment

### Prerequisites

1. MongoDB Atlas cluster
2. Azure Storage account (or use in-memory for development)
3. OAuth app credentials (GitHub, Google, Microsoft)
4. Brevo account for email (optional)

### Environment Variables

Ensure all required environment variables are set in production:
- `ATLAS_URI`
- `ATLAS_DATABASE_NAME`
- `AUTH_SECRET`
- Provider credentials (GitHub, Google, Microsoft, Email)
- Azure Storage credentials

### Build

```bash
# Build editor
cd apps/editor
npm run build

# Start production server
npm start
```

### Vercel Deployment

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

---

## Troubleshooting

### Database Connection Issues

**Symptom**: "Found projects: 0" or auth errors

**Solution**: Check MongoDB Atlas connection:
1. Verify `ATLAS_URI` is correct
2. Check IP whitelist in Atlas
3. Verify database user permissions

### userId Migration

**Symptom**: Projects not showing after authentication

**Cause**: Projects have `userId` as ObjectId instead of string

**Solution**: Run migration script:
```bash
node scripts/migrate-userid-to-string.mjs
```

Or manually update in MongoDB:
```javascript
db.projects.find({ userId: { $type: "objectId" } }).forEach(function(doc) {
  db.projects.updateOne(
    { _id: doc._id },
    { $set: { userId: doc.userId.toString() } }
  );
});
```

### Server Component Errors

**Symptom**: "Functions cannot be passed directly to Client Components"

**Cause**: Passing Next.js `Link` as `component` prop to MUI components

**Solution**: Wrap MUI component with Link:
```tsx
// ❌ Wrong
<Button component={Link} href="/projects">...</Button>

// ✅ Correct
<Link href="/projects">
  <Button>...</Button>
</Link>
```

---

## References

- [Auth.js Documentation](https://authjs.dev)
- [Next.js App Router](https://nextjs.org/docs/app)
- [MongoDB Node Driver](https://mongodb.github.io/node-mongodb-native/)
- [Azure Storage SDK](https://docs.microsoft.com/en-us/azure/storage/)

---

**For detailed feature specifications, see individual spec folders in `specs/`**

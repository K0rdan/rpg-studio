# RPG Studio Editor - Technical Documentation

**Version**: 1.1
**Last Updated**: 2026-09-20

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Patterns](#design-patterns)
3. [Authentication](#authentication)
4. [Routing & Navigation](#routing--navigation)
5. [API Conventions](#api-conventions)
6. [Database](#database)
7. [Storage](#storage)
8. [Domain Notes](#domain-notes)
9. [Development Guide](#development-guide)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Material-UI, Zustand
- **Backend**: Next.js API Routes, MongoDB (native driver)
- **Authentication**: Better-Auth (MongoDB adapter, magic link, dev-only password)
- **Storage**: Azure Blob Storage (Azurite locally), in-memory fallback
- **Engine**: Pure TypeScript + Canvas 2D
- **AI generation**: Google Gemini (tilesets and charsets)
- **Monorepo**: Turborepo

### Project Structure

```
rpg-studio/
├── apps/
│   ├── editor/          # Next.js editor application
│   ├── player/          # Vite player application
│   └── docs/            # Docusaurus documentation
├── packages/
│   ├── core/            # Game engine (Canvas 2D, collision, rendering)
│   ├── types/           # Shared TypeScript types
│   ├── storage/         # Storage abstraction + Azure and in-memory implementations
│   ├── tsconfig/        # Shared TypeScript config
│   ├── eslint-config/   # Shared lint config
│   └── ui/              # Shared React components
└── specs/               # Feature specifications
```

### Key Principles

1. **Separation of Concerns**: Editor (React) ↔ Engine (Vanilla TS) ↔ Types (Contract). No React in `packages/core`.
2. **Type Safety**: All game logic starts with type definitions in `@packages/types`.
3. **User Isolation**: All project data is scoped to the authenticated owner.
4. **Graceful Degradation**: The app keeps working with limited features when services are unavailable (asset images become an "unavailable" state, the header falls back to signed-out).
5. **Lightweight Player**: `apps/player` only consumes `@packages/core` and game data.

---

## Design Patterns

### MongoDB ObjectId vs String Pattern

**Rule**: `_id` is an `ObjectId` in MongoDB; everything else (foreign keys, API payloads, props, stores, types) uses strings. Convert to `ObjectId` only for `_id` queries, after validating the input.

```typescript
// Read: convert immediately
const { _id, ...rest } = doc;
const project = { ...rest, id: _id.toHexString() };

// Query: ObjectId for _id, string for foreign keys
await db.collection('projects').findOne({
  _id: new ObjectId(projectId),
  userId: session.user.id,
});
```

Key points:

- `ObjectId` and its hex string are **not interchangeable** in queries; MongoDB compares type and value.
- Do not return raw documents to clients (they carry `_id`).
- Validate ids received from URLs/bodies before `new ObjectId(...)`. Prefer a strict 24-hex check: `ObjectId.isValid` also accepts any 12-character string.
- Reuse `requireProjectAccess` and `projectOwnerId` for owner comparisons; they already tolerate legacy ObjectId `userId` values.

**See**: `specs/DESIGN_MONGODB_OBJECTID_PATTERN.md` for the complete rules, pitfalls, and migration notes.

---

## Authentication

### Overview

Authentication is handled by **Better-Auth** (`better-auth`) with the official MongoDB adapter, using the same native `MongoClient` approach as the rest of the app. It replaced Auth.js / NextAuth (spec `010-better-auth`); specs `007-rpg-editor-auth` describe the historical implementation.

| Piece                  | File                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Server instance        | `apps/editor/src/lib/auth.ts`                                                                             |
| Route handler          | `apps/editor/src/app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`)                                |
| Client                 | `apps/editor/src/lib/auth-client.ts` (`authClient`, `signIn`, `signOut`, `useSession`, `magicLinkClient`) |
| Server session (pages) | `apps/editor/src/lib/session.ts` (`getServerSession`, `requireSession`)                                   |
| Server session (APIs)  | `apps/editor/src/lib/apiAuth.ts` (`requireApiSession`, `requireProjectAccess`)                            |
| Cookie gate            | `apps/editor/src/proxy.ts`                                                                                |
| Login UI               | `apps/editor/src/app/login/page.tsx`, `components/auth/LoginForm.tsx`                                     |

### Enabled Sign-in Methods

1. **Email magic link** (SMTP via Nodemailer, e.g. Brevo).
2. **Email + password**, **development only** (`NODE_ENV === 'development'`).

Social providers (GitHub, Google, Microsoft Entra ID) are **currently commented out** in `auth.ts`. The buttons in `LoginForm` are still rendered but will not work until the providers are re-enabled.

### Configuration

```bash
# apps/editor/.env.local

# Better-Auth
BETTER_AUTH_SECRET=              # signing secret (Better-Auth default variable name)
BETTER_AUTH_BASE_URL=http://localhost:3000   # falls back to NEXTAUTH_URL, then localhost:3000

# MongoDB (also used by the Better-Auth adapter)
ATLAS_URI=
ATLAS_DATABASE_NAME=

# Magic link email (SMTP)
EMAIL_SERVER_HOST=smtp-relay.brevo.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-smtp-key
EMAIL_FROM=no-reply@yourdomain.com

# Social providers (only if re-enabled in auth.ts)
# AUTH_GITHUB_ID= / AUTH_GITHUB_SECRET=
# AUTH_GOOGLE_ID= / AUTH_GOOGLE_SECRET=
# AUTH_MICROSOFT_ENTRA_ID_ID= / _SECRET= / _TENANT_ID=common
```

### Data Model

Better-Auth manages its own collections through the adapter: `user`, `session`, `account`, `verification`. They differ from Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`), so **user ids changed** with the migration. `user.oldId` is an additional field intended to link a user to their legacy Auth.js id.

Application code must go through `auth.api` and must not query these collections directly. See the ObjectId design document.

### Protection Layers

1. **`proxy.ts` (cookie-only gate)**: for `/projects/*`, redirects to `/login?returnTo=…` when there is no session cookie. It does not validate the session; it only avoids a database round-trip for the common expired-cookie case, and forwards the target URL in the `x-return-to` header.
2. **`requireSession()` (pages)**: `app/projects/layout.tsx` re-validates the session server-side for every protected segment and redirects to the login screen when missing, expired, or revoked.
3. **`requireApiSession()` / `requireProjectAccess()` (API routes)**: answer with JSON errors, never redirects.
4. **`apiFetch` (client)**: on a 401 it sends the browser to the login page (preserving the current URL as `returnTo`); callers still receive the response.

`returnTo` values are sanitized (`sanitizeReturnTo`): only same-origin paths starting with a single `/` are accepted, to prevent open redirects.

### API Protection Pattern

```typescript
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response; // 401 | 403 | 404

  const { userId, project } = access;
  // Protected logic here
}
```

`requireProjectAccess` responses:

| Status | When                                      |
| ------ | ----------------------------------------- |
| 401    | No session, or the session lookup threw   |
| 404    | Malformed project id or project not found |
| 403    | The project belongs to another user       |

> Known gap: projects without a `userId` (created before ownership was recorded) are allowed for any authenticated user. Because of the Better-Auth id change, they should be migrated and this branch removed (see the ObjectId design document).

Routes that do not depend on a project use `requireApiSession()`.

### Error Handling

- `getServerSession` catches lookup failures, logs them, and returns `null` (the page then treats the user as signed out).
- `Header` and the home page also catch failures so the UI degrades to the signed-out state when the database is unreachable.
- Wrap route logic in `try/catch` and return `500` with a generic message; log details server-side.

### Testing

Better-Auth is mocked at the `auth.api.getSession` level:

```typescript
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));
jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

mockedGetSession.mockResolvedValue({ user: { id: 'test-user-123' } });
```

**See**: `specs/010-better-auth/` for the migration specification.

---

## Routing & Navigation

### Route Structure

#### Public Routes

- **`/`**: Landing page. Welcome message for guests, "Go to Your Projects" for authenticated users.
- **`/login`**: Sign-in page. Redirects to `returnTo` (default `/projects`) when already signed in.

#### Protected Routes (`/projects/*`)

- **`/projects`**: Projects list (owner's projects only).
- **`/projects/[projectId]`**: Project detail page (maps, characters, tilesets).
- **`/projects/[projectId]/editor`**: The unified editor (project explorer, tile palette, canvas, inspector). This is the main workspace.
- **`/projects/[projectId]/maps/[mapId]`**: Legacy standalone map editor (`MapEditor`).
- **`/projects/[projectId]/characters/[characterId]`**: Character editor.

Authentication for these routes is enforced by `proxy.ts` (cookie gate) and `app/projects/layout.tsx` (`requireSession`). API ownership is enforced per request by `requireProjectAccess`.

### Navigation Components

#### Header

- Logo → `/`
- "Projects" button → `/projects` (visible when authenticated)
- User menu with sign out (`authClient.signOut()`)
- "Sign In" button → `/login` (visible when not authenticated)

### Authentication Flow

```
1. User opens /projects/... without a session cookie
2. proxy.ts redirects to /login?returnTo=<original path>
3. User signs in (magic link, or password in development)
4. Better-Auth sets the session cookie
5. LoginForm redirects to returnTo
6. requireSession() re-validates the session for the protected segment
```

### Protected Page Pattern

```typescript
export default async function ProtectedPage() {
  const session = await requireSession(); // redirects to /login when missing
  // Protected content here (session.user.id)
}
```

---

## API Conventions

- **Auth**: every project-scoped route starts with `requireProjectAccess(projectId)`.
- **Ids**: strings in and out (`id`), validated before conversion to `ObjectId`.
- **Client calls**: use `apiFetch`, which handles session expiry.
- **Status codes**: `400` invalid payload, `401` unauthenticated, `403` forbidden (also built-in assets that cannot be modified), `404` not found, `409` conflict (asset still in use, non-empty folder), `413` file too large, `502` storage unavailable.
- **Asset usage conflicts** return `409` with `{ message, kind, id, origin?, usages[] }`.
- **Asset images** are served through the editor origin (`/api/projects/[projectId]/assets/[kind]/[assetId]/image`), never as direct storage URLs.

---

## Database

### MongoDB Configuration

#### Environment Variables

```bash
ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/
ATLAS_DATABASE_NAME=rpg-studio
```

For local development without Atlas, run `docker compose up -d` from the repository root and use:

```bash
ATLAS_URI=mongodb://127.0.0.1:27017/rpg-studio
ATLAS_DATABASE_NAME=rpg-studio
```

See `docker/README.md`.

#### Collections (application data)

- **`projects`**: Game projects
  - `_id`: ObjectId
  - `userId`: string (owner; Better-Auth user id)
  - `name`: string
  - `maps`: string[]
  - `characters`: string[]
  - `tilesets`: string[]
  - `sprites`: string[]
  - `assetFolders`: `{ tileset?: string[], charset?: string[] }` (declared asset folders)

- **`maps`**: Game maps (no `projectId`; linked through `projects.maps`)
  - `_id`: ObjectId
  - `name`, `width`, `height`
  - `tilesetId`: string (default tileset, equals `tilesetIds[0]`)
  - `tilesetIds`: string[] (append-only; packed tile refs index into it)
  - `layers`: `{ name, data: number[], visible?, priority? }[]`
  - `entities`: `Entity[]` (embedded; entity ids are strings)

- **`tilesets`**: Project tileset metadata
  - `_id`: ObjectId
  - `projectId`: string
  - `name`: string
  - `folderPath`: string (optional; absent means root)
  - `tile_width`, `tile_height`: number (display size)
  - `source_tile_width`, `source_tile_height`: number (optional, source image grid)
  - `tiles`: `{ id, is_collidable?, collisionRect? }[]` (sparse collision marks)
  - `storageLocation`: string (storage key)
  - `generation_metadata`: optional

- **`tilesetCollisionOverlays`**: Per-project collision marks for **registry** tilesets (`ts1`, …), which have no document
  - `projectId`, `tilesetId`, `tiles`, `updatedAt`

- **`sprites`**: Charset metadata
  - `_id`: ObjectId
  - `projectId`, `userId`: string
  - `name`: string
  - `folderPath`: string (optional)
  - `mimeType`, `frame_width`, `frame_height`
  - `animations`: `Record<string, number[]>`
  - `storageKey`, `storageLocation`: string
  - `generation_metadata`: optional

- **`characters`**: Character templates (`name`, `hp`, `maxHp`, `attack`, `defense`, `spriteId`)

#### Collections (Better-Auth)

`user`, `session`, `account`, `verification`. Managed by the adapter; access through `auth.api` only.

### Connection Handling

`apps/editor/src/lib/mongodb.ts` uses a cached singleton with retry (3 attempts, 2 s delay). Clients are created with `createMongoClient` (`lib/mongoClient.ts`), which injects the `os` runtime adapter so the driver also works under Jest and some bundlers.

```typescript
export async function connectToDatabase() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  const client = createMongoClient(uri!);
  // retry loop...
  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}
```

In tests, the URI and database name come from `globalThis.__ATLAS_URI__` / `__ATLAS_DATABASE_NAME__` (in-memory MongoDB).

---

## Storage

### Azure Blob Storage

`packages/storage` provides the `TilesetStorage` interface with two implementations: `AzureTilesetStorage` and `InMemoryTilesetStorage`. `apps/editor/src/lib/storage.ts` picks one:

- In-memory when `NODE_ENV === 'test'` or `USE_IN_MEMORY_STORAGE === 'true'`.
- Azure when configuration is available.
- In-memory (with a warning) when Azure configuration is missing.

#### Configuration

```bash
# Option A: connection string (also Azurite locally)
AZURE_STORAGE_CONNECTION_STRING=

# Option B: Service Principal
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# Common
AZURE_STORAGE_TILESETS_CONTAINER=assets     # default: assets
AZURE_STORAGE_IS_PUBLIC=false               # true for public containers
AZURE_STORAGE_SAS_EXPIRY_HOURS=24
AZURE_STORAGE_PUBLIC_BASE_URL=              # optional CDN base URL
```

For local development, run Azurite via Docker Compose and set `AZURE_STORAGE_CONNECTION_STRING` to the emulator account (see `apps/editor/.env.docker.example`). Do not set Service Principal variables in that mode.

#### Storage Path Structure

```
<container>/
└── users/
    └── {userId}/
        └── projects/
            └── {projectId}/
                ├── tilesets/
                │   └── {tilesetId}.{ext}
                └── sprites/
                    └── {spriteId}.{ext}
```

Sprite keys are **rebuilt deterministically** (`buildSpriteStorageKey`) rather than trusted from the document. The owner segment uses `projectOwnerId(project, sessionUserId)`, which falls back to the uploader for legacy projects.

Asset folders (`folderPath`) are metadata only and never appear in storage keys, so moving an asset is a database update and leaves the blob untouched.

#### Interface Summary

| Method                                            | Purpose                                            |
| ------------------------------------------------- | -------------------------------------------------- |
| `uploadTilesetImage` / `deleteTilesetAssets`      | Tileset-specific key convention                    |
| `uploadFile(key, data, mime)` / `deleteFile(key)` | Explicit key (sprites, generated charsets)         |
| `downloadFile(key)`                               | Read bytes so the app can serve them itself        |
| `fileExists(key)`                                 | Existence check without transfer                   |
| `getTilesetImageUrl`                              | Storage-host URL (SAS); not used for editor images |

#### Serving Images

Images are streamed by the editor itself:

```
GET /api/projects/{projectId}/assets/{tileset|charset}/{assetId}/image
```

Reasons: no CORS rules needed on the storage host, signatures stay server-side, and same-origin bytes let the editor sample pixels from a canvas (Fit opaque). Responses are `private, immutable` because a replaced image gets a new asset id. `resolveAssetImageSource` returns an empty string when storage cannot serve the file; clients turn that into an "unavailable" state.

**See**: `specs/005-package-storage/`, `specs/006-rpg-editor-storage-usage/`, `specs/021-asset-folders/`.

---

## Domain Notes

Short pointers to behaviours that are easy to get wrong. Details are in the feature specs.

- **Layers** (013, 015): ordered `layers`, optional `visible` (missing = visible) and `priority` (`below` | `same` | `above`, missing = `below`).
- **Layer focus** (014) and **canvas viewport** (018): editor-session presentation only; never persisted, never applied in preview or player.
- **Multi-tileset maps** (020): layer `data` stays `number[]`; a cell is `-1` (empty) or `(tilesetIndex << 16) | localId`. `tilesetIds` is **append-only**; never reorder or delete entries.
- **Collision** (016, 019): blocking marks live on tileset `tiles`. Only visible `below` layers contribute solids. The player collides with a feet box against optional per-tile rectangles.
- **Asset management** (017) and **folders** (021): usage is computed on demand from the project's maps, entities and characters. Deleting an in-use asset or a non-empty folder returns `409`. Built-in registry tilesets cannot be modified or deleted (`403`).

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
   - MongoDB connection (`ATLAS_URI`, `ATLAS_DATABASE_NAME`)
   - `BETTER_AUTH_SECRET` and `BETTER_AUTH_BASE_URL`
   - SMTP settings for magic links (or use the dev password login)
   - Azure Storage credentials (optional, falls back to in-memory)
   - `GEMINI_API_KEY` (only for AI tileset/charset generation)

### Testing

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- projects.test.ts

# Run with coverage
npm test -- --coverage
```

- `apps/editor`: Jest (API routes against an in-memory MongoDB, helpers), Cypress for editor flows.
- `packages/core`: Vitest.
- API route tests mock `@/lib/auth` (`auth.api.getSession`), `next/headers`, and `@/lib/storage`.

### Code Style

- **TypeScript**: strict mode
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier (via ESLint)

---

## Deployment

### Prerequisites

1. MongoDB Atlas cluster
2. Azure Storage account (or in-memory for development)
3. SMTP account for magic links (e.g. Brevo)
4. OAuth app credentials, only if social providers are re-enabled
5. Gemini API key, if AI generation is used

### Environment Variables

Ensure these are set in production:

- `ATLAS_URI`, `ATLAS_DATABASE_NAME`
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_BASE_URL`
- `EMAIL_SERVER_*`, `EMAIL_FROM`
- Azure Storage variables (see [Storage](#storage))
- `GEMINI_API_KEY` (optional)

The dev password login is disabled outside `NODE_ENV=development`.

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
2. Set environment variables in the Vercel dashboard
3. Deploy

---

## Troubleshooting

### Database Connection Issues

**Symptom**: "Found projects: 0", auth errors, or a "database unavailable" banner

**Solution**: Check the MongoDB connection:

1. Verify `ATLAS_URI` is correct
2. Check the IP allow list in Atlas
3. Verify database user permissions

### Projects Not Showing After Signing In

**Symptom**: A user signs in but sees no projects.

**Causes** (check in this order):

1. **Better-Auth migration**: the user has a new id, but `projects.userId` still holds the old Auth.js id. Link users through `user.oldId` and rewrite `projects.userId`.
2. **`userId` stored as ObjectId** instead of string.

Migration for case 2:

```javascript
db.projects.find({ userId: { $type: 'objectId' } }).forEach(function (doc) {
  db.projects.updateOne(
    { _id: doc._id },
    { $set: { userId: doc.userId.toString() } },
  );
});
```

### 500 Instead of 404 on a Bad Id

**Symptom**: A malformed id in a URL causes an Internal Server Error.

**Cause**: `new ObjectId(value)` throws on invalid input and the route does not validate first.

**Solution**: validate with a strict 24-hex check (do not rely on `ObjectId.isValid`, which accepts any 12-character string) and answer `404`.

### Redirect Loop or Wrong Redirect After Login

**Cause**: `returnTo` must be a same-origin path. Values that do not start with a single `/` are ignored and the default `/projects` is used.

### Magic Link Not Received

Check the `EMAIL_SERVER_*` variables and `EMAIL_FROM`. In development, use "Dev Login with Password" to bypass email.

### Server Component Errors

**Symptom**: "Functions cannot be passed directly to Client Components"

**Cause**: Passing Next.js `Link` as `component` prop to MUI components

**Solution**: Wrap the MUI component with Link:

```tsx
// ❌ Wrong
<Button component={Link} href="/projects">...</Button>

// ✅ Correct
<Link href="/projects">
  <Button>...</Button>
</Link>
```

### Asset Image Shows as Unavailable

**Cause**: storage could not serve the file (`resolveAssetImageSource` returned an empty string), or the storage account is unreachable.

**Solution**: check the storage configuration and that the blob exists at the expected key. Gameplay is not affected; the editor shows an "unavailable" state.

---

## References

- [Better-Auth Documentation](https://www.better-auth.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [MongoDB Node Driver](https://mongodb.github.io/node-mongodb-native/)
- [Azure Storage SDK](https://docs.microsoft.com/en-us/azure/storage/)

---

**For detailed feature specifications, see individual spec folders in `specs/`**

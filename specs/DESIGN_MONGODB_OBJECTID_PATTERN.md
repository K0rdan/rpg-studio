# MongoDB ObjectId vs String: Design Pattern

**Status**: Approved (revised)
**Original date**: 2025-12-29
**Revised**: 2026-09-20 (Better-Auth migration, corrected rationale, added helpers and pitfalls)
**Applies to**: All features using MongoDB

## Problem Statement

MongoDB uses `ObjectId` as the native type of `_id`. In application code this type:

- Is a class instance, so it cannot cross the Next.js Server Component → Client Component boundary and does not match the shared types (`id: string`).
- Is **not equal** to its hex string in MongoDB queries: the driver compares type _and_ value.
- Makes comparisons fragile when mixed with string ids coming from the session (Better-Auth) or from URLs.

## Decision: Strings Everywhere Except Direct DB Operations

**Store `_id` as ObjectId, store every foreign key as a string, work with strings everywhere else.**

| Concern                 | Rule                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Primary key             | `_id: ObjectId` (MongoDB native)                                                        |
| Foreign keys            | `string` (`userId`, `projectId`, `spriteId`, `tilesetId`, ids inside `project.maps`, …) |
| API / props / stores    | `id: string` (hex), never `_id`, never `ObjectId`                                       |
| Queries on `_id`        | `new ObjectId(id)` after validating `id`                                                |
| Queries on other fields | Use the string as is                                                                    |
| Shared types            | `string`, never `ObjectId`                                                              |

## Rationale

1. **Server/Client boundary and shared types.** `ObjectId` does have a `toJSON()` (it serializes to its hex string), so `NextResponse.json(doc)` does not crash, but it emits `_id`, not `id`. React Server Components cannot pass class instances to Client Components, and `@packages/types` exposes `id: string`. Converting once, right after reading, keeps the whole stack on one shape.

2. **No implicit type coercion in MongoDB.** `{ userId: new ObjectId(x) }` does **not** match a document whose `userId` is the string `x`, and vice versa. Keeping every foreign key as a string makes queries predictable and lets us compare with `===` without `.equals()`.

3. **Session ids are strings.** With Better-Auth, `session.user.id` is a string (same as it was with Auth.js). Storing `Project.userId` as a string means the ownership check is a plain string comparison.

4. **Packed and embedded references are strings.** `project.maps: string[]`, `Map.tilesetIds: string[]`, `Entity.spriteId`, asset usage payloads, and storage keys are all built from string ids. No conversion is needed to build them.

> Note: the previous version claimed that "MongoDB can query with either type". That is incorrect and has been removed. Mixing types silently returns no result.

## Better-Auth

Authentication moved from Auth.js to Better-Auth (spec `010-better-auth`). Impact on this pattern:

- `session.user.id` is a string, exactly as before. No change to API guards (`requireApiSession`, `requireProjectAccess`).
- Better-Auth manages its own collections: `user`, `session`, `account`, `verification` (Auth.js used `users`, `accounts`, `sessions`, `verification_tokens`). Their ids are therefore **different** from the ids Auth.js produced.
- The `oldId` additional field on `user` (see `apps/editor/src/lib/auth.ts`) exists to link a new user to the id of the legacy user.
- Better-Auth's Mongo adapter stores its own `_id` values and exposes them as string ids through its API. **Never** query `user`/`session`/`account` directly with the driver in application code; go through `auth.api`. If you ever need to, check how the adapter stores foreign keys on your installed version first.

Consequence: a project created before the migration has `userId` equal to an **old Auth.js id**. See "Migration" below.

## Implementation Rules

### Rule 1: Store foreign keys as strings

```typescript
// ✅ CORRECT
interface ProjectDocument {
  _id: ObjectId; // MongoDB native id
  userId: string; // foreign key, always a string
  maps: string[]; // hex ids
}

// ❌ WRONG
interface ProjectDocument {
  _id: ObjectId;
  userId: ObjectId; // do not use ObjectId for foreign keys
}
```

### Rule 2: Convert `_id` immediately after reading

```typescript
// ✅ CORRECT
const { _id, ...rest } = doc;
return { ...rest, id: _id.toHexString() };

// ❌ WRONG: leaks _id (and an ObjectId) to the client
return NextResponse.json(doc);
```

Do not return both `_id` and `id`. `PUT /maps/[mapId]` currently spreads the raw document and adds `id`, so `_id` is still serialized; strip it.

### Rule 3: Use `ObjectId` only for `_id` queries, and validate first

```typescript
// ✅ CORRECT
const project = await db.collection('projects').findOne({
  _id: new ObjectId(projectId), // string → ObjectId for _id only
  userId, // string as is
});

// ❌ WRONG: a string never matches an ObjectId _id
await db.collection('projects').findOne({ _id: projectId });
```

### Rule 4: Compare strings

```typescript
// Legacy documents may still hold an ObjectId in userId
const ownerId =
  project.userId instanceof ObjectId
    ? project.userId.toHexString()
    : project.userId;

if (ownerId && ownerId !== session.userId) {
  // forbidden
}
```

This defensive normalization is implemented once in `requireProjectAccess` (`apps/editor/src/lib/apiAuth.ts`) and `projectOwnerId` (`apps/editor/src/lib/assetStorage.ts`). Reuse them instead of re-implementing it.

### Rule 5: Validate ids that come from the outside

`new ObjectId(value)` **throws** on an invalid value. In a route handler that means a 500 instead of a 404. Validate before converting.

Beware of `ObjectId.isValid()`: it also returns `true` for **any 12-character string** (for example `'abcdefghijkl'`), because a 12-byte value is a valid input. For ids received in URLs or bodies, prefer a strict check:

```typescript
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function parseObjectId(value: unknown): ObjectId | null {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value)
    ? new ObjectId(value)
    : null;
}
```

`apps/editor/src/app/api/projects/[projectId]/tilesets/[tilesetId]/route.ts` already uses `OBJECT_ID_PATTERN`. `apiAuth.ts`, `sprites/[spriteId]/route.ts` and the asset usage route use `ObjectId.isValid`. Several routes (`maps/[mapId]`, `maps/[mapId]/entities`, `characters/[characterId]`, project deletion, `project.maps.map(id => new ObjectId(id))`) convert without any validation.

**Recommended (not yet implemented)**: put `parseObjectId` in `apps/editor/src/lib/objectId.ts` and use it everywhere an id comes from a URL, a body, or a stored id list.

### Rule 6: One DTO mapper

**Recommended (not yet implemented)**: replace the hand-written `{ _id, ...rest }` blocks with a single helper.

```typescript
export function toDto<T extends { _id: ObjectId }>(
  doc: T,
): Omit<T, '_id'> & { id: string } {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
}
```

## Special Cases

- **Registry tilesets** (`ts1`, …) are not ObjectIds. They live in `apps/editor/src/config/tilesets.ts`. Any code that receives a `tilesetId` must accept both a registry id and a 24-hex id (see `resolveTilesetOrigin`).
- **Entity ids** are strings generated with `new ObjectId().toString()` and embedded in `map.entities[]`. They are not `_id`s of a collection.
- **Legacy projects without `userId`** are currently readable by any authenticated user (`requireProjectAccess`). See "Migration".

## Migration

Two independent migrations may be needed on old data.

**1. `userId` stored as ObjectId** (pre-pattern data):

```typescript
const projects = await db.collection('projects').find({}).toArray();

for (const project of projects) {
  if (project.userId instanceof ObjectId) {
    await db
      .collection('projects')
      .updateOne(
        { _id: project._id },
        { $set: { userId: project.userId.toHexString() } },
      );
  }
}
```

**2. Auth.js → Better-Auth user ids.** Better-Auth created new users with new ids. For each new user with an `oldId`, rewrite `projects.userId` from the old id to the new one. Once every project has an owner, remove the "no `userId` means readable by everyone" branch from `requireProjectAccess`, otherwise an orphaned project is exposed to any signed-in user.

## Testing Pattern

```typescript
const userId = 'test-user-123'; // string
const projectId = new ObjectId().toHexString(); // string

await db.collection('projects').insertOne({
  _id: new ObjectId(projectId),
  userId, // string
  name: 'Test Project',
});

// Better-Auth is mocked at the API level
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));
jest.mock('@/lib/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

mockedGetSession.mockResolvedValue({ user: { id: userId } });
```

## Common Pitfalls

1. **Storing an ObjectId in a foreign key**: `userId: new ObjectId(session.user.id)`.
2. **Comparing without normalizing**: `project.userId !== userId` fails when `project.userId` is an ObjectId.
3. **Returning a raw document**: `NextResponse.json(projectDoc)` sends `_id`, not `id`.
4. **Trusting `ObjectId.isValid`** for user input (accepts 12-char strings) or **not validating at all** (500 instead of 404).
5. **Querying `{ _id: stringId }`**, which never matches.
6. **Direct queries on Better-Auth collections** instead of `auth.api`.

## Alternatives Considered

- **`_id` as a string everywhere** (`new ObjectId().toHexString()` or `nanoid`): removes every conversion, but requires migrating existing data, and Better-Auth's collections stay ObjectId-based. Worth revisiting if the conversion helpers prove insufficient.
- **Runtime validation at the API boundary (Zod)**: complements this pattern by validating ids and payloads before they reach the driver, without adopting an ODM.
- **An ODM (Mongoose/Prisma)**: rejected in spec 010 because it would require rewriting every non-auth query.
- **A `projectId` field on maps and characters** (like `tilesets` and `sprites` already have): would replace the `project.maps` / `project.characters` id arrays that must be kept in sync with `$push`/`$pull`.

## Summary

- **Store**: `_id` as ObjectId, foreign keys as strings.
- **Query**: validate, then convert a string to ObjectId only for `_id`.
- **Return**: always `id: string`, never `_id`.
- **Compare**: make both sides strings first (use the shared helpers).
- **Types**: `string` in TypeScript interfaces, never `ObjectId`.
- **Auth**: `session.user.id` is a string; Better-Auth data is accessed through `auth.api`.

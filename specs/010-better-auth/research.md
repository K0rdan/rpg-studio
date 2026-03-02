# Phase 0: Research & Technical Validation

## Resolved Unknowns

### 1. Database Adapter for Better-Auth
**Decision**: Use `@better-auth/mongodb` adapter with the existing raw `mongodb` driver.  
**Rationale**: The project currently uses raw `mongodb` driver (version `^6.21.0`) + `@auth/mongodb-adapter`. `better-auth` provides its own official MongoDB adapter (`better-auth/adapters/mongodb`) which integrates seamlessly without needing an ORM like Prisma or Mongoose. This allows dropping `@auth/mongodb-adapter` directly in favor of the better-auth equivalent without adding bloat.  
**Alternatives evaluated**: Switching to Prisma or Mongoose. Rejected as it would require rewriting non-auth queries in the `apps/editor` project.

### 2. Testing Framework Impact
**Decision**: Update Cypress E2E tests and Jest unit tests that explicitly mock or rely on `next-auth`.  
**Rationale**: `better-auth` changes the API surface for session checking (`auth.getSession()` vs `next-auth`'s `getServerSession()`). Tests will need to be updated to mock the new `better-auth` client/server hooks.  
**Alternatives evaluated**: Leaving tests broken (violates Constitution Check TDD rule).

## Migration Strategy

### 1. Dependency Updates
- **Remove**: `next-auth`, `@auth/mongodb-adapter`, `@auth/core` (override)
- **Add**: `better-auth`

### 2. Implementation Steps
- Create `apps/editor/src/lib/auth.ts` config for `better-auth`.
- Connect the `mongodb` database client to `better-auth`.
- Re-configure Email (Magic Link) and OAuth providers using `better-auth` syntax.
- Update `/api/auth/[...nextauth]` to `/api/auth/[...all]` using the `better-auth` Next.js route handler.
- Replace `useSession` from `next-auth/react` with `client.useSession` from `better-auth` client.

### 3. Schema Management
- Next-Auth creates `users`, `accounts`, `sessions`, `verification_tokens` collections.
- Better-Auth creates similar collections (`user`, `account`, `session`, `verification`).
- The existing users will be migrated if necessary, or the database can be cleared if this is still pre-production.

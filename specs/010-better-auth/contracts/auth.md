# Authentication API Contracts

The migration to `better-auth` standardizes our authentication endpoints through a single Next.js API route handler, while exposing strongly typed client and server SDKs.

## 1. Edge API Route
**Endpoint**: `ANY /api/auth/[...all]`  
**Purpose**: Handles all authentication requests (login, register, session validation, OAuth callbacks) automatically via `better-auth`.
**Implementation**: `apps/editor/src/app/api/auth/[...all]/route.ts`

## 2. Server-side Contract
**Location**: `apps/editor/src/lib/auth.ts`
**Export**: `auth` (BetterAuth Server Instance)
**Methods**:
- `auth.api.getSession({ headers })`: Validate incoming requests/RSCs.
- `auth.api.signOut({ headers })`: Invalidate a session server-side.

## 3. Client-side Contract
**Location**: `apps/editor/src/lib/auth-client.ts`
**Export**: `authClient` (BetterAuth Client Instance), `useSession`
**Methods**:
- `authClient.signIn.email({ email, password })`: Authenticate via credentials/magic link.
- `authClient.signIn.social({ provider: 'google' | 'discord' | 'github' | 'microsoft' })`: Authenticate via OAuth.
- `authClient.signOut()`: Destroy the current session.
- `useSession()`: React hook to access current user data and loading state.

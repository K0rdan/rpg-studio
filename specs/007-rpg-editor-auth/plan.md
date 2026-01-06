# Plan: RPG Editor Authentication

**Feature Branch**: `007-rpg-editor-auth`
**Goal**: Implement OIDC Authentication using Auth.js (NextAuth.js v5).

## Technical Approach

We will use **Auth.js** (formerly NextAuth.js), the standard authentication solution for Next.js applications. Specifically, we will target **v5** (beta) as it is designed for the App Router architecture used in `apps/editor`.

### 1. Core Dependencies

- `next-auth@beta`: The authentication framework.
- `@auth/mongodb-adapter`: Adapter to persist users and sessions in our existing MongoDB instance.
- `@auth/core`: Core logic (bundled with next-auth).

### 2. Configuration (`auth.ts`)

We will centralize authentication configuration in `apps/editor/src/auth.ts` (or `lib/auth.ts`).
This configuration will include:
- **Providers**: `GitHub`, `Google`, `MicrosoftEntraID` (for Outlook/Office 365).
- **Adapter**: `MongoDBAdapter` connected to our `lib/mongodb` client.
- **Callbacks**: To inject the User ID into the session object (critical for API usage).

### 3. Database Schema

The `MongoDBAdapter` will automatically create the following collections if they don't exist:
- `users`
- `accounts` (stores OAuth tokens/linkage)
- `sessions` (if using database sessions)
- `verification_tokens` (not needed for OAuth-only)

We will configure `session: { strategy: "jwt" }` to minimize database writes for session checks, or "database" if we strict server-side control. JWT is usually standard for Single Page Apps but Database sessions are robust. Given "User Persistence" is key, the Adapter handles user creation regardless of session strategy.

### 4. API Integration

We will expose the standard route handler at `apps/editor/src/app/api/auth/[...nextauth]/route.ts`.

### 5. Client Integration

- **API Access**: Update `apps/editor/src/app/api/projects/...` routes to replace the `x-user-id` header check with `auth()` (server-side session check).
- **UI Components**:
  - `SessionProvider`: Wrap the application layout.
  - `UserMenu`: A component in the AppBar showing the user's avatar and a "Sign Out" button.
  - `SignInButton`: A generic component to trigger the sign-in flow.

## Architecture

```mermaid
graph TD
    User[User Browser] -->|Click Sign In| Client[Next.js Client]
    Client -->|Redirect| AuthAPI[NextAuth API Route]
    AuthAPI -->|OIDC Handshake| Provider[GitHub/Google/Microsoft]
    Provider -->|Callback| AuthAPI
    AuthAPI -->|Upsert| DB[(MongoDB users)]
    AuthAPI -->|Set Cookie| User
    User -->|API Req + Cookie| ProtectedAPI[Protected API Route]
    ProtectedAPI -->|Validate| AuthConfig[auth() helper]
    AuthConfig -->|Read| Session
```

## Environment Variables

We will need to define:
- `AUTH_SECRET`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ID` / `AUTH_MICROSOFT_ENTRA_ID_SECRET`

# Feature Specification: RPG Editor Authentication

**Feature Branch**: `007-rpg-editor-auth`  
**Created**: 2025-12-21  
**Status**: Draft  
**Input**: User request: "We will introduce the ability to authenticate ourselves. We need the ability to use standard OIDC method with also standard integration : GitHub, Gmail, Outlook, ..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sign In with OIDC Providers (Priority: P1)

As a user, I want to sign in using my existing GitHub, Google, or Microsoft account so that I don't have to create and remember a new password.

**Why this priority**: Access control is fundamental for user-specific data (projects, assets).

**Independent Test**:
1. User clicks "Sign In".
2. User chooses a provider (GitHub, Google, Microsoft).
3. User completes the flow on the provider's site.
4. User is redirected back to the editor, authenticated, and sees their profile info.

**Acceptance Scenarios**:
1. **Given** I am on the login page, **When** I click "Sign in with GitHub", **Then** I am redirected to GitHub and back to the app as an authenticated user.
2. **Given** I am on the login page, **When** I click "Sign in with Google", **Then** I am redirected to Google and back to the app as an authenticated user.
3. **Given** I am on the login page, **When** I click "Sign in with Microsoft", **Then** I am redirected to Microsoft and back to the app as an authenticated user.
4. **Given** `AZURE_AD_CLIENT_ID` is missing, **When** the app starts, **Then** the Microsoft provider option is disabled or hidden (graceful degradation).

---

### User Story 2 - User Persistence (Priority: P1)

As a system, I want to store user details in the database upon first login so that I can link projects and assets to the user.

**Why this priority**: We need a `User` record to satisfy the foreign key relationship in `Project.userId` and the storage path structure.

**Independent Test**:
1. A new user signs in via OIDC.
2. Check MongoDB `users` collection.
3. Verify a new document exists with the provider's email, name, and image.

**Acceptance Scenarios**:
1. **Given** a new user signing in for the first time, **When** the callback completes, **Then** a new User document is created in MongoDB with fields `name`, `email`, `image`.
2. **Given** an existing user signing in, **When** the callback completes, **Then** their existing User document is updated (e.g. last login) but not duplicated.

---

### User Story 3 - Protected Routes (Priority: P2)

As a user, I should not be able to access restricted pages (like Dashboard or Editor) if I am not logged in.

**Acceptance Scenarios**:
1. **Given** I am unauthenticated, **When** I visit `/dashboard`, **Then** I am redirected to the login page.
2. **Given** I am authenticated, **When** I visit `/dashboard`, **Then** I see the dashboard.

---

### User Story 4 - Sign Out (Priority: P2)

As a user, I want to sign out so that I can end my session on a shared computer.

**Acceptance Scenarios**:
1. **Given** I am logged in, **When** I click "Sign Out", **Then** my session is destroyed and I am redirected to the home/login page.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST support authentication via OAuth 2.0 / OIDC and Email:
  - GitHub
  - Google (Gmail)
  - Microsoft Entra ID / Microsoft Account (Outlook)
  - Email (Magic Link) via SMTP
- **FR-002**: The system MUST persist user data to the existing MongoDB database in the `users` collection.
- **FR-003**: The system MUST use the `User` entity defined in `@packages/types`.
- **FR-004**: The system MUST provide session state to the React client (via Context/Hook).
- **FR-005**: The system MUST protect API routes that modify data (POST, PUT, DELETE) to ensure the user is authenticated.
- **FR-006**: The system MUST link the authenticated User ID (`sub` or database ID) to created Projects.

### Non-Functional Requirements

- **NFR-001**: Authentication session MUST persist across page reloads (JWT or Session Cookie).
- **NFR-002**: Configuration secrets (Client ID, Secret) MUST be loaded from environment variables.
- **NFR-003**: The UI MUST be responsive and provide visual feedback during the login redirect process.

### Key Entities

- **User**:
  - `id`: string (Database ID)
  - `name`: string
  - `email`: string
  - `image`: string (Avatar URL)
  - `emailVerified`: Date (optional)
- **Session**:
  - `userId`: string
  - `expires`: Date
  - `sessionToken`: string

## Constitutional Alignment _(mandatory)_

- **Principle I: Respect for Types**: Use `@packages/types` User definition. Extend it if necessary for Auth.js adapter compatibility.
- **Principle II: Separation of Concerns**: Authentication logic resides in `lib/auth.ts` or `app/api/auth`, separate from business logic.
- **Principle VI: Secure Access**: Only authenticated users can manage projects.

## Success Criteria _(mandatory)_

- **SC-001**: A user can log in with at least one provider and see their name in the UI.
- **SC-002**: Use of `x-user-id` mock header validation is replaced by real session validation in API routes.
- **SC-003**: A `User` document is created in MongoDB after login.

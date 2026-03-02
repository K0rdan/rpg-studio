# Feature Specification: Migrate to Better-Auth

**Feature Branch**: `010-better-auth`  
**Created**: 2026-02-21  
**Status**: ✅ Implemented  
**Input**: User description: "Since we are facing incompatiblity issues inbetween next-auth, @auth/core and nodemailer, I suggest to switch the authentication library to better-auth which is now the next 'standard' of authentication for Next.js application."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Existing Authentication (Priority: P1)

As a developer and user, I want the authentication system to function exactly as before (login, logout, session management) but powered by better-auth to resolve compatibility issues.

**Why this priority**: Core authentication is required for the application to function. Incompatibilities in the current stack are causing build/runtime issues.

**Independent Test**: Can be fully tested by successfully logging in, creating an account, and logging out.

**Acceptance Scenarios**:

1. **Given** a user is on the login page, **When** they enter valid credentials, **Then** they are authenticated and redirected to the dashboard.
2. **Given** a logged-in user, **When** they click logout, **Then** their session is destroyed and they return to the public site.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace all `next-auth` and `@auth/core` dependencies with `better-auth`.
- **FR-002**: System MUST configure `better-auth` to support the existing providers (Email/Nodemailer, OAuth if any).
- **FR-003**: System MUST update all database schemas and adapters (e.g., MongoDB/Mongoose or Prisma) to match the `better-auth` expected schema.
- **FR-004**: System MUST update all client-side and server-side session checks to use `better-auth` hooks/APIs instead of `next-auth`'s `useSession` or `auth()`.

### Key Entities *(include if feature involves data)*

- **User**: Represents the authenticated user.
- **Session**: Active session data for the user.
- **Account**: Tied to OAuth providers if used.
- **VerificationToken**: For email magic links/verification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application builds successfully without next-auth/nodemailer incompatibility errors.
- **SC-002**: Existing user authentication flow works transparently end-to-end.

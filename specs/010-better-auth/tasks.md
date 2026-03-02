# Tasks: Migrate to Better-Auth

**Input**: Design documents from `/specs/010-better-auth/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install `better-auth` dependency in `apps/editor`
- [x] T002 Remove `next-auth`, `@auth/mongodb-adapter`, and `@auth/core` from `apps/editor/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create Better-Auth server instance in `apps/editor/src/lib/auth.ts`
- [x] T004 Setup MongoDB adapter for Better-Auth using the existing MongoDB client in `auth.ts`
- [x] T005 Create Better-Auth Next.js edge route handler in `apps/editor/src/app/api/auth/[...all]/route.ts`
- [x] T006 Create Better-Auth client instance in `apps/editor/src/lib/auth-client.ts`
- [x] T007 Delete old Next-Auth route handler from `apps/editor/src/app/api/auth/` (if exists)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Maintain Existing Authentication (Priority: P1) 🎯 MVP

**Goal**: The authentication system functions exactly as before (login, logout, session management) but powered by better-auth to resolve compatibility issues.

**Independent Test**: Can be fully tested by successfully logging in, creating an account, and logging out.

### Implementation for User Story 1

- [x] T008 [P] [US1] Refactor Auth context wrappers/providers in `apps/editor` layouts to use `better-auth` React hooks
- [x] T009 [P] [US1] Update login page/components to use `authClient.signIn.email` instead of `signIn('email')`
- [x] T010 [P] [US1] Update OAuth sign-in buttons to use `authClient.signIn.social` instead of `signIn('provider')`
- [x] T011 [P] [US1] Update logout functionality to use `authClient.signOut()` instead of `signOut()`
- [x] T012 [P] [US1] Update server-side components and API routes to use `auth.api.getSession` instead of Next-Auth's `auth()`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---


- [x] T013 [P] Update Cypress E2E auth tests to mock or login via `better-auth`
- [x] T014 [P] Update Jest unit tests to mock `better-auth` client/server hooks
- [x] T015 [P] Smoke test authentication flows locally (Social, Magic Link, Dev Password)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

# Tasks: RPG Editor Authentication

**Branch**: `007-rpg-editor-auth` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Setup & Configuration

- [x] T001 Install dependencies (`next-auth@beta`, `@auth/mongodb-adapter`)
- [x] T002 Generate `AUTH_SECRET` and configure `apps/editor/.env.local.example` with provider variables
- [x] T003 Create `apps/editor/src/auth.ts` configuration with Providers and Adapter
- [x] T003a Add Nodemailer (SMTP) provider
- [x] T004 Implement `apps/editor/src/app/api/auth/[...nextauth]/route.ts` handler

## Phase 2: Client-Side Integration

- [x] T005 Create `apps/editor/src/components/auth/SignInButton.tsx`
- [x] T006 Create `apps/editor/src/components/auth/UserMenu.tsx` (Avatar + Sign Out)
- [x] T007 Integrate `SessionProvider` (if needed) or use Server Components approach in `apps/editor/src/app/layout.tsx`
- [x] T008 Update `AppBar` to include UserMenu/SignInButton

## Phase 3: API & Data Protection

- [x] T009 Update `apps/editor/src/app/api/projects/route.ts` (POST) to use `auth()` for userId
- [x] T010 Update `apps/editor/src/app/api/projects/[projectId]/tilesets/route.ts` to use `auth()`
- [x] T011 Remove mock `x-user-id` logic from API routes
- [x] T012 Verify MongoDB `users` collection population on login
- [x] T013 Create comprehensive tests for authenticated API routes
- [x] T014 Update existing tests to mock auth session

## Phase 4: Verification & Polish

> ⚠️ **Note**: This feature (007) has been superseded by [010-better-auth](../010-better-auth/). The items below reflect the original next-auth plan; refer to 010 for the current auth implementation status.

- [x] T013 [Test] Manual verification of GitHub Login *(social providers temporarily disabled in 010)*
- [x] T014 [Test] Manual verification of Google Login *(social providers temporarily disabled in 010)*
- [x] T015 [Test] Manual verification of Logout *(verified via dev password flow in 010)*
- [ ] T016 [Doc] Update Setup Guide/README with Auth instructions

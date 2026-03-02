# Implementation Plan: Migrate to Better-Auth

**Branch**: `010-better-auth` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-better-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Migrate the authentication system from `next-auth` and `@auth/core` to `better-auth` to resolve incompatibilities, particularly with Nodemailer. Ensure all existing routes, database schemas, and session checks are updated accordingly.

## Technical Context

**Language/Version**: TypeScript, Node.js, Next.js 15+ (App Router)  
**Primary Dependencies**: `better-auth` replacing `next-auth`  
**Storage**: MongoDB via `better-auth/adapters/mongodb` (native driver, no Mongoose)  
**Testing**: Cypress for E2E, Jest for unit tests  
**Target Platform**: Vercel/Web  
**Project Type**: Next.js Web App (`apps/editor`)  
**Performance Goals**: N/A  
**Constraints**: Must maintain existing session security and support current OAuth/Email providers.  
**Scale/Scope**: Replace authentication layer across the Next.js app.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Respect for Types**: All new auth configurations must be properly typed, and schemas must be aligned in `packages/types` if any.
- **Separation of Concerns**: Auth logic sits in `apps/editor` or a shared auth package, not `packages/core`.
- **Lightweight Player**: Player app remains agnostic from editor user authentication unless it requires its own tokens.
- **Prioritize Native Canvas**: N/A for auth.
- **TDD**: E2E tests for authentication (if any) must be updated to pass.

## Project Structure

### Documentation (this feature)

```text
specs/010-better-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
rpg-studio/
├── apps/
│   ├── editor/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   └── api/auth/[...all]/route.ts  # Better-auth edge route
│   │   │   ├── lib/
│   │   │   │   └── auth.ts                     # Better-auth config
│   │   │   └── components/
│   │   │       └── auth/                       # UI components updated hooks
│   └── ...
└── packages/
    ├── types/                                  # Shared type updates
    └── ...
```

**Structure Decision**: Authentication logic is primarily isolated inside `apps/editor/src/lib/auth.ts` and the `api/auth/[...all]` route for Next.js endpoints.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |

# RPG Studio - Specifications Index

**Project**: RPG Studio  
**Type**: 2D Game Editor & Player  
**Architecture**: Monorepo (Turborepo)

---

## 📚 Documentation Structure

### Core Documentation
- **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - Complete technical guide
  - Architecture overview
  - Design patterns
  - Authentication
  - Routing & navigation
  - Database
  - Storage
  - Development guide
  - Deployment
  - Troubleshooting

### Design Patterns
- **[DESIGN_MONGODB_OBJECTID_PATTERN.md](./DESIGN_MONGODB_OBJECTID_PATTERN.md)** - ObjectId vs String pattern
  - Storage rules
  - Query patterns
  - Conversion patterns
  - Migration strategies

---

## 🎯 Feature Specifications

### Implemented Features

#### 001 - Project Management
**Status**: ✅ Complete  
**Path**: `001-rpg-editor-project-management/`

Core project CRUD operations with MongoDB persistence.

- [Specification](./001-rpg-editor-project-management/spec.md)
- [Implementation Plan](./001-rpg-editor-project-management/plan.md)
- [Tasks](./001-rpg-editor-project-management/tasks.md)

#### 002 - Player Core
**Status**: ✅ Complete  
**Path**: `002-rpg-player-core/`

Pure TypeScript game engine using Canvas 2D API.

- [Specification](./002-rpg-player-core/spec.md)
- [Implementation Plan](./002-rpg-player-core/plan.md)
- [Tasks](./002-rpg-player-core/tasks.md)

#### 003 - Map Creation
**Status**: ✅ Complete  
**Path**: `003-rpg-editor-map-creation/`

Map editor with tileset support and layer management.

- [Specification](./003-rpg-editor-map-creation/spec.md)
- [Implementation Plan](./003-rpg-editor-map-creation/plan.md)
- [Tasks](./003-rpg-editor-map-creation/tasks.md)

#### 004 - Preview System
**Status**: ✅ Complete  
**Path**: `004-rpg-editor-preview/`

Real-time game preview using the core engine.

- [Specification](./004-rpg-editor-preview/spec.md)
- [Implementation Plan](./004-rpg-editor-preview/plan.md)
- [Tasks](./004-rpg-editor-preview/tasks.md)

#### 005 - Storage Package
**Status**: ✅ Complete  
**Path**: `005-package-storage/`

Abstraction layer for Azure Blob Storage and in-memory storage.

- [Specification](./005-package-storage/spec.md)
- [Implementation Plan](./005-package-storage/plan.md)
- [Tasks](./005-package-storage/tasks.md)

#### 006 - Storage Usage
**Status**: ✅ Complete  
**Path**: `006-rpg-editor-storage-usage/`

Integration of storage package with tileset upload/management.

- [Specification](./006-rpg-editor-storage-usage/spec.md)
- [Implementation Plan](./006-rpg-editor-storage-usage/plan.md)
- [Tasks](./006-rpg-editor-storage-usage/tasks.md)

#### 007 - Authentication
**Status**: ✅ Complete  
**Path**: `007-rpg-editor-auth/`

Multi-provider authentication with Auth.js (NextAuth.js v5).

- [Specification](./007-rpg-editor-auth/spec.md)
- [Implementation Plan](./007-rpg-editor-auth/plan.md)
- [Tasks](./007-rpg-editor-auth/tasks.md)
- [Implementation Summary](./007-rpg-editor-auth/IMPLEMENTATION_SUMMARY.md)

#### 008 - Map Entity Placement
**Status**: 🚧 In Progress  
**Path**: `008-rpg-editor-map-entities/`

Place interactive entities (NPCs, player spawns, interactions) on map tiles with charset animations.

- [Specification](./008-rpg-editor-map-entities/spec.md)
- [Data Model](./008-rpg-editor-map-entities/data-model.md)
- [Implementation Plan](./008-rpg-editor-map-entities/plan.md)
- [Tasks](./008-rpg-editor-map-entities/tasks.md)

#### 009 - Editor UI Layout & Navigation
**Status**: 📋 Planned  
**Path**: `009-rpg-editor-ui-layout/`

Modern editor UI with hierarchical project explorer, resizable panels, tile palette, inspector, and optional tile tagging system.

- [Specification](./009-rpg-editor-ui-layout/spec.md)
- [Data Model](./009-rpg-editor-ui-layout/data-model.md)
- [Implementation Plan](./009-rpg-editor-ui-layout/plan.md)
- [Tasks](./009-rpg-editor-ui-layout/tasks.md)
- [Wireframe](./009-rpg-editor-ui-layout/wireframe.md)


---

## 🏗️ Architecture Principles

### Golden Rules

1. **Respect for Types**: All game logic starts with type definitions in `@packages/types`
2. **Separation of Concerns**: Editor (React) ↔ Engine (Vanilla TS) ↔ Types (Contract)
3. **Lightweight Player**: Player loads `@packages/core` and game data only
4. **Native Canvas**: Use `CanvasRenderingContext2D`, no external engines
5. **MongoDB ObjectId Pattern**: Use strings for IDs, ObjectId only for `_id` queries
6. **User Isolation**: All data scoped to authenticated users

### Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Material-UI
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Authentication**: Auth.js (NextAuth.js v5)
- **Storage**: Azure Blob Storage
- **Engine**: Pure TypeScript + Canvas 2D
- **Monorepo**: Turborepo

---

## 📖 Quick Start

### For Developers

1. **Read**: [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)
2. **Setup**: Follow development guide in technical docs
3. **Understand**: Review design patterns (especially ObjectId pattern)
4. **Implement**: Check feature specs for implementation details

### For New Features

1. **Create Spec**: Copy template from existing feature folder
2. **Define Types**: Start with `@packages/types`
3. **Plan**: Create `spec.md`, `plan.md`, `tasks.md`
4. **Implement**: Follow established patterns
5. **Test**: Write tests following existing patterns
6. **Document**: Update technical documentation

---

## 🔍 Finding Information

### By Topic

| Topic | Location |
|-------|----------|
| Authentication | `TECHNICAL_DOCUMENTATION.md` → Authentication |
| Database Patterns | `DESIGN_MONGODB_OBJECTID_PATTERN.md` |
| Routing | `TECHNICAL_DOCUMENTATION.md` → Routing |
| Storage | `TECHNICAL_DOCUMENTATION.md` → Storage |
| API Protection | `TECHNICAL_DOCUMENTATION.md` → Authentication |
| Error Handling | `TECHNICAL_DOCUMENTATION.md` → Troubleshooting |
| Deployment | `TECHNICAL_DOCUMENTATION.md` → Deployment |

### By Feature

| Feature | Spec Folder |
|---------|-------------|
| Projects | `001-rpg-editor-project-management/` |
| Game Engine | `002-rpg-player-core/` |
| Maps | `003-rpg-editor-map-creation/` |
| Preview | `004-rpg-editor-preview/` |
| Storage | `005-package-storage/`, `006-rpg-editor-storage-usage/` |
| Auth | `007-rpg-editor-auth/` |
| Map Entities | `008-rpg-editor-map-entities/` |


---

## 📝 Specification Template

Each feature specification follows this structure:

```
XXX-feature-name/
├── spec.md              # User stories, requirements, success criteria
├── plan.md              # Technical approach, architecture decisions
├── tasks.md             # Actionable implementation tasks
└── IMPLEMENTATION_SUMMARY.md  # Post-implementation summary (optional)
```

---

## 🚀 Recent Updates

- **2026-01-05**: Created consolidated technical documentation
- **2025-12-29**: Established MongoDB ObjectId pattern
- **2025-12-23**: Completed authentication implementation
- **2025-12-21**: Added email authentication (Brevo)

---

## 📞 Support

For questions or issues:
1. Check `TECHNICAL_DOCUMENTATION.md` → Troubleshooting
2. Review relevant feature specification
3. Check design patterns documentation

---

**Next Steps**: Start with [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) for a complete overview.

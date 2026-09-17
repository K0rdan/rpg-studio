# RPG Studio Editor

A powerful 2D game editor for creating RPG adventures.

## 📚 Documentation

**All technical documentation has been consolidated in the specs directory.**

👉 **[Read the Complete Technical Documentation](../specs/TECHNICAL_DOCUMENTATION.md)**

### Quick Links

- **[Getting Started](../specs/TECHNICAL_DOCUMENTATION.md#development-guide)** - Setup and development
- **[Authentication Setup](../specs/TECHNICAL_DOCUMENTATION.md#authentication)** - Configure OAuth providers
- **[Routing Guide](../specs/TECHNICAL_DOCUMENTATION.md#routing--navigation)** - Page structure and navigation
- **[Database Patterns](../specs/DESIGN_MONGODB_OBJECTID_PATTERN.md)** - MongoDB best practices
- **[Troubleshooting](../specs/TECHNICAL_DOCUMENTATION.md#troubleshooting)** - Common issues and solutions

### Feature Specifications

- [001 - Project Management](../specs/001-rpg-editor-project-management/)
- [002 - Player Core](../specs/002-rpg-player-core/)
- [003 - Map Creation](../specs/003-rpg-editor-map-creation/)
- [004 - Preview System](../specs/004-rpg-editor-preview/)
- [005 - Storage Package](../specs/005-package-storage/)
- [006 - Storage Usage](../specs/006-rpg-editor-storage-usage/)
- [007 - Authentication](../specs/007-rpg-editor-auth/)

Local MongoDB and Azurite: see [docker/README.md](../../docker/README.md).

## 🚀 Quick Start

```bash
# Install dependencies (from the repo root)
npm install

# Local MongoDB + Azure Storage emulator (no Atlas / Azure account)
docker compose up -d
# Then copy apps/editor/.env.docker.example values into apps/editor/.env.local

# Or point .env.local at Atlas and an Azure storage account instead

# Start the editor
npm run dev --workspace=@apps/editor
```

Visit http://localhost:3000

## 🏗️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Material-UI
- **Language**: TypeScript
- **Database**: MongoDB (Atlas in production, Docker locally)
- **Authentication**: Auth.js (NextAuth.js v5)
- **Storage**: Azure Blob Storage (Azurite locally)

## 📖 Learn More

- [Complete Technical Documentation](../specs/TECHNICAL_DOCUMENTATION.md)
- [Specifications Index](../specs/README.md)
- [Design Patterns](../specs/DESIGN_MONGODB_OBJECTID_PATTERN.md)

---

**For detailed information, please refer to the [specs directory](../specs/).**

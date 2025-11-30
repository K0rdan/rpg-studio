---
description: How to verify the RPG Player Core features
---

# Walkthrough - RPG Player Core

This walkthrough verifies the functionality of the RPG Player Core, including game loading, map rendering, and character movement.

## Prerequisites

1.  Ensure you have Node.js installed.
2.  Install dependencies: `npm install`
3.  Build shared packages:
    *   `cd packages/types && npm run build`
    *   `cd packages/core && npm run build`

## 1. Run Unit Tests

Verify that the core engine logic is working correctly.

```bash
cd packages/core
npm test
```

**Expected Output**: All tests passed (GameLoop, Renderer, InputManager, Scene, MapRenderer, SpriteRenderer).

## 2. Run Player Application

Start the Vite development server for the player.

```bash
cd apps/player
npm run dev
```

**Action**: Open your browser to `http://localhost:5173`.

**Verification**:
*   You should see a canvas element.
*   A map should be rendered (grass and stone tiles).
*   A hero sprite should be visible at position (100, 100).

## 3. Test Gameplay

**Action**:
*   Press the **Arrow Keys** (Up, Down, Left, Right).

**Verification**:
*   The hero sprite should move in the corresponding direction.
*   The hero sprite should animate (walk cycle) while moving.
*   The hero sprite should stop animating (idle frame) when keys are released.
*   The hero should be stopped by the map boundaries (cannot walk off the map).

## 4. Run E2E Tests

Verify the critical flows using Cypress.

```bash
cd apps/player
npx cypress run
```

**Expected Output**: All specs passed (`game_load.cy.ts`, `game_play.cy.ts`).

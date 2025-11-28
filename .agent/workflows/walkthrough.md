---
description: How to verify the RPG Editor Project Management features
---

# Verification Walkthrough

This document outlines the steps to verify the implementation of the RPG Editor Project Management features.

## Prerequisites

- Node.js (v18+)
- MongoDB (running locally or accessible)
- `npm` installed

## 1. Setup

Ensure dependencies are installed:

```bash
npm install
```

## 2. Running Unit Tests

Run the unit tests to verify the API endpoints and logic:

```bash
cd apps/editor
npm run test
```

Expected output: All tests should pass.

## 3. Running End-to-End (E2E) Tests

Run the Cypress E2E tests to verify the user flows:

```bash
cd apps/editor
npm run e2e
```

Or to run them in headless mode:

```bash
cd apps/editor
npx cypress run
```

Expected output: All specs (`project_flow.cy.ts`, `map_flow.cy.ts`, `character_flow.cy.ts`) should pass.

## 4. Manual Verification

1.  **Start the Editor**:
    ```bash
    cd apps/editor
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

2.  **Project Management**:
    -   Click "New Project".
    -   Enter a project name and submit.
    -   Verify the project appears in the list.
    -   Click the project to open it.

3.  **Map Management**:
    -   Inside a project, click "New Map".
    -   Enter map details (Name, Width, Height) and create.
    -   Verify the map appears in the list.
    -   Click the map to open the editor.
    -   Select a tile from the palette and paint on the canvas.
    -   Click "Save Map".
    -   Go back to the project page and verify the map is still there.
    -   Delete the map and verify it's gone.

4.  **Character Management**:
    -   Inside a project, click "New Character".
    -   Enter character details (Name, HP, etc.) and create.
    -   Verify the character appears in the list.
    -   Click the character to open the editor.
    -   Modify stats and save.
    -   Go back to the project page and verify the character is still there.
    -   Delete the character and verify it's gone.

5.  **Project Deletion**:
    -   Go back to the home page.
    -   Delete the project you created.
    -   Verify it's removed from the list.

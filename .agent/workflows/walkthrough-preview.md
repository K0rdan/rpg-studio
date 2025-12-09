# Walkthrough: Editor Preview

## Prerequisites
- **Editor**: Running on `http://localhost:3000` (`npm run dev` in `apps/editor`).
- **Player**: Running on `http://localhost:5173` (`npm run dev` in `apps/player`).
- **Database**: MongoDB running.

## Steps

1.  **Open Editor**:
    - Go to `http://localhost:3000`.
    - Open a project with a map.

2.  **Verify New Controls**:
    - Navigate to the Map Editor for a map.
    - Verify there is a **Play** button (Green or Secondary color) in the toolbar.

3.  **Launch Preview**:
    - Click **Play**.
    - A full-screen overlay should appear.
    - Within the overlay, an iframe loads the Player.
    - **Check**: The game should start (e.g. you might see the character or map).
    - *Note*: If tilesets/images are missing, they might show as black squares, but the loop should run.

4.  **Pause & Resume**:
    - Click the **Pause** icon in the overlay header.
    - **Check**: The game logic should freeze (animations stop).
    - Click the **Play** icon (Resume) in the header.
    - **Check**: The game logic resumes.

5.  **Stop**:
    - Click the **Stop** icon (Square) or **Close** icon (X).
    - **Check**: The overlay should close, returning you to the Map Editor.

6.  **Verify Updates**:
    - Make a change to the map (e.g. paint a tile).
    - Click **Save Map**.
    - Click **Play** again.
    - **Check**: The preview should show the updated map.

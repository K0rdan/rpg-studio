# Data Model: Entity Visual Content

**Feature**: 012 | **Branch**: `012-entity-visual-content`

---

## Updated: `Sprite` type (`packages/types/src/sprite.ts`)

```typescript
export interface Sprite {
  id: string;
  name: string;
  /** Full URL of the spritesheet image (signed URL from storage) */
  image_source: string;
  /** Width of a single animation frame in pixels */
  frame_width: number;
  /** Height of a single animation frame in pixels */
  frame_height: number;
  /**
   * Named animation states → flat frame indices into the spritesheet.
   * Standard RPG charset layout (4 cols × 4 rows of 32×64):
   *   idle:       [1]
   *   walk_down:  [0, 1, 2, 3]
   *   walk_left:  [4, 5, 6, 7]
   *   walk_right: [8, 9, 10, 11]
   *   walk_up:    [12, 13, 14, 15]
   */
  animations: Record<string, number[]>;
  // --- new fields ---
  /** Azure Blob storage key (server only, not sent to client in image_source form) */
  storageKey?: string;
  /** Project this sprite belongs to */
  projectId?: string;
  /** When the sprite was created */
  createdAt?: Date;
}
```

---

## MongoDB: `sprites` collection

```json
{
  "_id": ObjectId,
  "name": "Hero Charset",
  "projectId": "abc123",
  "storageKey": "sprites/abc123/hero-charset.png",
  "storageLocation": "sprites/abc123/hero-charset.png",
  "frame_width": 32,
  "frame_height": 64,
  "animations": {
    "idle":       [1],
    "walk_down":  [0, 1, 2, 3],
    "walk_left":  [4, 5, 6, 7],
    "walk_right": [8, 9, 10, 11],
    "walk_up":    [12, 13, 14, 15]
  },
  "createdAt": ISODate
}
```

---

## Updated: `GameProject` type (`packages/types/src/project.ts`)

```diff
 export interface GameProject {
   id: string;
   name: string;
   maps: string[];
   characters: string[];
   entities?: string[];
   tilesets?: string[];
+  sprites?: string[];  // Array of sprite IDs (project sprite library)
   userId: string;
 }
```

---

## `Entity.spriteId` — no change needed

`Entity.spriteId?: string` already exists. This field is the link from an entity to its project-level sprite. The player entity will use `spriteId` to reference its charset sprite.

---

## Animation State Machine (engine-side, `packages/core`)

```
PlayerController state machine:
  dx > 0 → walk_right
  dx < 0 → walk_left
  dy > 0 → walk_down
  dy < 0 → walk_up
  dx=0, dy=0 → idle
```

Implemented inside `PlayerController.update()` by calling `spriteRenderer.setAnimation(stateName)`.

---

## `packages/core/src/PlayerController.ts` changes

```diff
 export class PlayerController {
+  private spriteRenderer: SpriteRenderer | null = null;
+
+  public setSpriteRenderer(sr: SpriteRenderer) {
+    this.spriteRenderer = sr;
+  }
 
   public update(deltaTime: number, input: InputManager) {
     // ... movement code ...
+    if (this.spriteRenderer) {
+      this.spriteRenderer.update(deltaTime);
+      const animState = getAnimationState(dx, dy);  // helper
+      this.spriteRenderer.setAnimation(animState);
+    }
   }
 
   public render(renderer: Renderer) {
+    if (this.spriteRenderer) {
+      const pixelX = this.x * this.tileWidth;
+      const pixelY = this.y * this.tileHeight;
+      this.spriteRenderer.render(renderer, pixelX, pixelY, this.tileWidth, this.tileHeight * 2);
+      return;
+    }
     // ... existing blue box fallback ...
   }
 }
```

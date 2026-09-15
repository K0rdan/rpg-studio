export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileProperties {
  id: number;
  is_collidable?: boolean;
  /** Normalized tile-space solid. Omitted on a collidable tile means the full cell. */
  collisionRect?: CollisionRect;
}

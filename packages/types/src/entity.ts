export enum EntityType {
  PlayerSpawn = 'player_spawn',
  NPC = 'npc',
  Interaction = 'interaction'
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  x: number; // Tile coordinate
  y: number; // Tile coordinate
  name: string;
}

export interface PlayerSpawnEntity extends BaseEntity {
  type: EntityType.PlayerSpawn;
  spriteId: string; // Reference to sprite for visual representation
}

export interface NPCEntity extends BaseEntity {
  type: EntityType.NPC;
  spriteId: string; // Reference to charset sprite
  characterId?: string; // Optional reference to character data
}

export interface InteractionEntity extends BaseEntity {
  type: EntityType.Interaction;
  // Future: event data, dialog references, etc.
}

export type Entity = PlayerSpawnEntity | NPCEntity | InteractionEntity;

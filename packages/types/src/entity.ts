// Trigger types - how entities activate
export enum TriggerType {
  ActionButton = 'action_button',    // Player presses Space/Enter
  PlayerTouch = 'player_touch',      // Player walks onto tile
  Autorun = 'autorun',               // Runs automatically when conditions met
  MapLoad = 'map_load',              // Runs when map loads
}

// Command types - what entities do when triggered
export enum CommandType {
  ShowMessage = 'show_message',
  TeleportPlayer = 'teleport_player',
  GiveItem = 'give_item',
}

// Command interfaces
export interface ShowMessageCommand {
  type: CommandType.ShowMessage;
  parameters: {
    text: string;
    face?: string;
    position?: 'top' | 'middle' | 'bottom';
  };
}

export interface TeleportPlayerCommand {
  type: CommandType.TeleportPlayer;
  parameters: {
    mapId?: string;  // Optional, same map if omitted
    x: number;
    y: number;
    direction?: 'up' | 'down' | 'left' | 'right';
  };
}

export interface GiveItemCommand {
  type: CommandType.GiveItem;
  parameters: {
    itemId: string;
    quantity: number;
  };
}

export type Command = ShowMessageCommand | TeleportPlayerCommand | GiveItemCommand;

// ─── Player-specific gameplay properties ────────────────────────────────────

/**
 * Gameplay properties specific to the Player entity.
 * Stored as a sub-object on Entity to keep NPC/trigger entities clean.
 */
export interface PlayerProperties {
  /** Movement speed in tiles per second. */
  speed: number;
  /** Current hit points. */
  health: number;
  /** Maximum hit points (used for health bar and respawn). */
  maxHealth: number;
}

/** Sensible defaults applied when a new player entity is created. */
export const DEFAULT_PLAYER_PROPERTIES: PlayerProperties = {
  speed: 4,
  health: 100,
  maxHealth: 100,
};

// ─── Entity interface ────────────────────────────────────────────────────────

export interface Entity {
  id: string;
  name: string;
  type?: 'player' | 'npc' | 'object' | 'door' | 'chest' | 'trigger';
  template?: string;

  // Location
  x: number;  // Tile coordinate
  y: number;  // Tile coordinate

  // Appearance (optional)
  spriteId?: string;
  direction?: 'up' | 'down' | 'left' | 'right';

  // Behavior — optional because player entities don't use trigger/commands
  trigger?: TriggerType;
  commands: Command[];

  // State
  enabled: boolean;
  notes?: string;

  // Player-specific properties — only present when type === 'player'
  playerProperties?: PlayerProperties;
}

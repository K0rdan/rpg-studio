import { TriggerType, CommandType, Entity } from '@packages/types';

export interface EntityTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  defaultEntity: Omit<Entity, 'id' | 'x' | 'y'>;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: 'player',
    label: 'Player',
    icon: 'SportsEsports',
    color: '#2196F3',
    defaultEntity: {
      name: 'Player',
      type: 'player',
      template: 'player',
      trigger: TriggerType.ActionButton,
      commands: [],
      enabled: true,
    },
  },
  {
    id: 'npc',
    label: 'NPC',
    icon: 'Person',
    color: '#4CAF50',
    defaultEntity: {
      name: 'New NPC',
      type: 'npc',
      template: 'npc',
      trigger: TriggerType.ActionButton,
      commands: [
        {
          type: CommandType.ShowMessage,
          parameters: {
            text: 'Hello!',
            position: 'bottom',
          },
        },
      ],
      enabled: true,
    },
  },
  {
    id: 'interactable',
    label: 'Interactable',
    icon: 'Description',
    color: '#2196F3',
    defaultEntity: {
      name: 'Sign',
      type: 'object',
      template: 'interactable',
      trigger: TriggerType.ActionButton,
      commands: [
        {
          type: CommandType.ShowMessage,
          parameters: {
            text: 'This is a sign.',
            position: 'bottom',
          },
        },
      ],
      enabled: true,
    },
  },
  {
    id: 'container',
    label: 'Container',
    icon: 'Inventory',
    color: '#FFC107',
    defaultEntity: {
      name: 'Chest',
      type: 'object',
      template: 'container',
      trigger: TriggerType.ActionButton,
      commands: [
        {
          type: CommandType.ShowMessage,
          parameters: {
            text: 'You found a treasure!',
            position: 'bottom',
          },
        },
        {
          type: CommandType.GiveItem,
          parameters: {
            itemId: 'potion_health',
            quantity: 1,
          },
        },
      ],
      enabled: true,
    },
  },
  {
    id: 'teleporter',
    label: 'Teleporter',
    icon: 'SwapHoriz',
    color: '#9C27B0',
    defaultEntity: {
      name: 'Teleporter',
      type: 'object',
      template: 'teleporter',
      trigger: TriggerType.PlayerTouch,
      commands: [
        {
          type: CommandType.TeleportPlayer,
          parameters: {
            x: 5,
            y: 10,
            direction: 'down',
          },
        },
      ],
      enabled: true,
    },
  },
  {
    id: 'event_zone',
    label: 'Event Zone',
    icon: 'Bolt',
    color: '#757575',
    defaultEntity: {
      name: 'Event Zone',
      type: 'object',
      template: 'event_zone',
      trigger: TriggerType.PlayerTouch,
      commands: [],
      enabled: true,
    },
  },
];

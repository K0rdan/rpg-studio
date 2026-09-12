import type { Entity } from '@packages/types';
import { describe, expect, it, vi } from 'vitest';
import { EntityRenderer } from './EntityRenderer';
import type { Renderer } from './Renderer';
import type { SpriteRenderer } from './SpriteRenderer';

function makeNpc(): Entity {
  return {
    id: 'npc-1',
    name: 'NPC',
    type: 'npc',
    x: 2,
    y: 3,
    commands: [],
    enabled: true,
  };
}

describe('EntityRenderer', () => {
  it('normalizes an NPC charset to one map tile when rendering', () => {
    const spriteRenderer = {
      render: vi.fn(),
    } as unknown as SpriteRenderer;
    const renderer = {} as Renderer;
    const entityRenderer = new EntityRenderer(
      makeNpc(),
      spriteRenderer,
      48,
      48,
    );

    entityRenderer.render(renderer);

    expect(spriteRenderer.render).toHaveBeenCalledWith(
      renderer,
      96,
      144,
      48,
      48,
    );
  });

  it('uses the sprite bottom edge as its render depth', () => {
    const entityRenderer = new EntityRenderer(makeNpc(), null, 48, 48);

    expect(entityRenderer.getRenderDepth()).toBe(192);
  });
});

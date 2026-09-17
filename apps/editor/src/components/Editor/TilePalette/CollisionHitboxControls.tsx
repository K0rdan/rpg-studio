'use client';

import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import { fitOpaqueCollisionRect } from '@packages/core';
import { useState } from 'react';
import { sampleTilePixels } from '@/lib/sampleTilePixels';
import { tileCollisionRect } from '@/lib/tilesetTiles';
import type { CollisionRect, Tileset } from '@packages/types';

interface CollisionHitboxControlsProps {
  tileset: Tileset;
  /** `null` keeps the controls in place but inert, so the palette never shifts. */
  tileId: number | null;
  onChange: (rect: CollisionRect | null) => void;
}

const FULL_TILE: CollisionRect = { x: 0, y: 0, width: 1, height: 1 };

function clampRect(next: CollisionRect): CollisionRect {
  const x = Math.min(0.95, Math.max(0, next.x));
  const y = Math.min(0.95, Math.max(0, next.y));
  const width = Math.min(1 - x, Math.max(0.05, next.width));
  const height = Math.min(1 - y, Math.max(0.05, next.height));
  return { x, y, width, height };
}

export const CollisionHitboxControls = ({
  tileset,
  tileId,
  onChange,
}: CollisionHitboxControlsProps) => {
  const disabled = tileId === null;
  const rect = tileId === null ? FULL_TILE : tileCollisionRect(tileset.tiles, tileId);
  const [fitMessage, setFitMessage] = useState<{ tileId: number; text: string } | null>(null);
  // A message about another tile would be misleading now that the controls stay mounted.
  const visibleFitMessage = fitMessage && fitMessage.tileId === tileId ? fitMessage.text : null;

  const patch = (partial: Partial<CollisionRect>) => {
    onChange(clampRect({ ...rect, ...partial }));
  };

  const fitOpaque = () => {
    if (tileId === null) return;

    // Tileset images are served by the editor itself, so sampling their pixels
    // through a canvas is allowed without any cross-origin negotiation.
    const image = new Image();
    image.onload = () => {
      const pixels = sampleTilePixels(image, tileId, tileset);
      if (!pixels) {
        setFitMessage({ tileId, text: 'Could not read tile pixels.' });
        return;
      }

      const fitted = fitOpaqueCollisionRect(pixels.data, pixels.width, pixels.height);
      if (!fitted) {
        setFitMessage({ tileId, text: 'No opaque pixels to fit.' });
        return;
      }

      setFitMessage(null);
      onChange(fitted);
    };
    image.onerror = () => {
      setFitMessage({ tileId, text: 'Could not load the tileset image.' });
    };
    image.src = tileset.image_source;
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {(['x', 'y', 'width', 'height'] as const).map((field) => (
          <TextField
            key={field}
            size="small"
            type="number"
            label={field}
            value={Number(rect[field].toFixed(2))}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05, 'aria-label': `Collision ${field}` } }}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              patch({ [field]: value });
            }}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          onClick={fitOpaque}
          disabled={disabled}
          aria-label="Fit opaque"
        >
          Fit opaque
        </Button>
        <Button
          size="small"
          disabled={disabled}
          onClick={() => { setFitMessage(null); onChange(null); }}
        >
          Full cell
        </Button>
      </Stack>
      {visibleFitMessage ? (
        <Alert severity="info" sx={{ mt: 1 }} onClose={() => setFitMessage(null)}>
          {visibleFitMessage}
        </Alert>
      ) : null}
    </Box>
  );
};

'use client';

import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import { fitOpaqueCollisionRect } from '@packages/core';
import { useState } from 'react';
import { sampleTilePixels } from '@/lib/sampleTilePixels';
import { tileCollisionRect } from '@/lib/tilesetTiles';
import type { CollisionRect, Tileset } from '@packages/types';

interface CollisionHitboxControlsProps {
  tileset: Tileset;
  tileId: number;
  onChange: (rect: CollisionRect | null) => void;
}

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
  const rect = tileCollisionRect(tileset.tiles, tileId);
  const [fitMessage, setFitMessage] = useState<string | null>(null);

  const patch = (partial: Partial<CollisionRect>) => {
    onChange(clampRect({ ...rect, ...partial }));
  };

  const fitOpaque = () => {
    // Tileset images are served by the editor itself, so sampling their pixels
    // through a canvas is allowed without any cross-origin negotiation.
    const image = new Image();
    image.onload = () => {
      const pixels = sampleTilePixels(image, tileId, tileset);
      if (!pixels) {
        setFitMessage('Could not read tile pixels.');
        return;
      }

      const fitted = fitOpaqueCollisionRect(pixels.data, pixels.width, pixels.height);
      if (!fitted) {
        setFitMessage('No opaque pixels to fit.');
        return;
      }

      setFitMessage(null);
      onChange(fitted);
    };
    image.onerror = () => {
      setFitMessage('Could not load the tileset image.');
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
        <Button size="small" variant="outlined" onClick={fitOpaque} aria-label="Fit opaque">
          Fit opaque
        </Button>
        <Button size="small" onClick={() => { setFitMessage(null); onChange(null); }}>
          Full cell
        </Button>
      </Stack>
      {fitMessage ? (
        <Alert severity="info" sx={{ mt: 1 }} onClose={() => setFitMessage(null)}>
          {fitMessage}
        </Alert>
      ) : null}
    </Box>
  );
};

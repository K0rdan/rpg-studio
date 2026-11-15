'use client';

import { useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { GenerationMode } from '@packages/types';

import {
  PATH_CENTER_EDGES_CORNERS_V1,
  slotById,
} from '@/lib/generation/pathAutotileLayout';

interface SceneTestPreviewProps {
  src: string;
  generationMode: GenerationMode;
  role: 'family' | 'transition';
  passedSlotIds?: string[];
}

function paintRepeat(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const tile = image.width;
  canvas.width = tile * 8;
  canvas.height = tile * 8;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      context.drawImage(image, x * tile, y * tile);
    }
  }
}

function paintProp(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
}

function paintPath(canvas: HTMLCanvasElement, image: HTMLImageElement, passedSlotIds?: string[]) {
  const layout = PATH_CENTER_EDGES_CORNERS_V1;
  const tile = image.width / layout.columns;
  const offered = (slotId: string) => !passedSlotIds || passedSlotIds.includes(slotId);
  canvas.width = tile * 8;
  canvas.height = tile * 6;
  const context = canvas.getContext('2d');
  if (!context || !Number.isFinite(tile) || tile <= 0) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const draw = (slotId: string, column: number, row: number) => {
    const slot = slotById(layout, slotId);
    const dx = column * tile;
    const dy = row * tile;
    if (!slot || !offered(slotId)) {
      context.fillStyle = '#333333';
      context.fillRect(dx, dy, tile, tile);
      return;
    }
    context.drawImage(
      image,
      slot.column * tile,
      slot.row * tile,
      tile,
      tile,
      dx,
      dy,
      tile,
      tile,
    );
  };

  ['edge-w', 'center', 'center', 'edge-e'].forEach((slotId, index) => {
    draw(slotId, index, 0);
  });
  ['edge-n', 'center', 'center', 'edge-s'].forEach((slotId, index) => {
    draw(slotId, 0, index + 2);
  });
  const corners = [
    ['corner-nw', 'edge-n', 'corner-ne'],
    ['edge-w', 'center', 'edge-e'],
    ['corner-sw', 'edge-s', 'corner-se'],
  ];
  corners.forEach((row, rowIndex) => {
    row.forEach((slotId, columnIndex) => {
      draw(slotId, columnIndex + 5, rowIndex + 2);
    });
  });
}

export function SceneTestPreview({
  src,
  generationMode,
  role,
  passedSlotIds,
}: SceneTestPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || role === 'transition') return undefined;
    const image = new Image();
    image.onload = () => {
      if (generationMode === 'texture') paintRepeat(canvas, image);
      else if (generationMode === 'path-autotile') paintPath(canvas, image, passedSlotIds);
      else paintProp(canvas, image);
    };
    image.src = src;
    return undefined;
  }, [generationMode, passedSlotIds, role, src]);

  if (role === 'transition') {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="scene-test-preview">
        Review the edge and join tiles in the atlas above before accepting the transition.
      </Typography>
    );
  }

  const caption = generationMode === 'texture'
    ? 'Scene test: the canonical tile repeated on an 8×8 patch. Seams on any edge fail review.'
    : generationMode === 'path-autotile'
      ? 'Scene test: a straight horizontal path, a straight vertical path, and the four corners. This layout has no T or cross junction.'
      : 'Scene test: the isolated decoration after background removal.';
  const label = generationMode === 'texture'
    ? '8×8 material repetition'
    : generationMode === 'path-autotile'
      ? 'Path autotile scene test'
      : 'Isolated decoration';

  return (
    <Stack spacing={1} data-testid="scene-test-preview">
      <Typography variant="body2" color="text.secondary">{caption}</Typography>
      <Box
        component="canvas"
        ref={canvasRef}
        aria-label={label}
        sx={{
          width: '100%',
          maxWidth: 320,
          height: 'auto',
          imageRendering: 'pixelated',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#1b1b1b',
        }}
      />
    </Stack>
  );
}

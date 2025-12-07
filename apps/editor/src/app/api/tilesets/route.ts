import { NextResponse } from 'next/server';
import type { Tileset } from '@packages/types';

export async function GET() {
  // Mock tilesets for now. In a real app, these might come from a DB or file system.
  const tilesets: Tileset[] = [
    {
      id: 'ts1',
      name: 'Fixed Tileset',
      image_source: '/tileset_fixed.png',
      tile_width: 128,
      tile_height: 128,
    }
  ];

  return NextResponse.json(tilesets);
}

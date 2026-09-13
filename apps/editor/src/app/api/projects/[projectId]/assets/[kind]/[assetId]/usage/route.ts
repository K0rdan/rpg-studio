import type { AssetKind, AssetUsageResponse } from '@packages/types';
import { ObjectId, type Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getTilesetById } from '@/config/tilesets';
import { requireProjectAccess } from '@/lib/apiAuth';
import { collectAssetUsages } from '@/lib/assetUsage';
import { connectToDatabase } from '@/lib/mongodb';
import { resolveTilesetOrigin } from '@/lib/tilesetOrigin';

interface AssetRegistry {
  maps: string[];
  characters: string[];
  tilesets: string[];
  sprites: string[];
}

function isAssetKind(value: string): value is AssetKind {
  return value === 'tileset' || value === 'charset';
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];
}

async function assetExists(
  db: Db,
  projectId: string,
  registry: AssetRegistry,
  kind: AssetKind,
  assetId: string,
): Promise<boolean> {
  if (kind === 'tileset') {
    if (getTilesetById(assetId)) {
      return true;
    }
    if (!registry.tilesets.includes(assetId) || !ObjectId.isValid(assetId)) {
      return false;
    }
    return Boolean(await db.collection('tilesets').findOne({
      _id: new ObjectId(assetId),
      projectId,
    }));
  }

  if (!registry.sprites.includes(assetId) || !ObjectId.isValid(assetId)) {
    return false;
  }
  return Boolean(await db.collection('sprites').findOne({
    _id: new ObjectId(assetId),
    projectId,
  }));
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; kind: string; assetId: string }>;
  },
) {
  try {
    const { projectId, kind, assetId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    if (!isAssetKind(kind)) {
      return NextResponse.json({ message: 'Invalid asset kind' }, { status: 400 });
    }

    const registry: AssetRegistry = {
      maps: stringIds(access.project.maps),
      characters: stringIds(access.project.characters),
      tilesets: stringIds(access.project.tilesets),
      sprites: stringIds(access.project.sprites),
    };
    const { db } = await connectToDatabase();

    if (!await assetExists(db, projectId, registry, kind, assetId)) {
      return NextResponse.json({ message: 'Asset not found' }, { status: 404 });
    }

    const response: AssetUsageResponse = {
      kind,
      id: assetId,
      usages: await collectAssetUsages(db, registry, kind, assetId),
    };
    if (kind === 'tileset') {
      response.origin = resolveTilesetOrigin(assetId);
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error collecting asset usage:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

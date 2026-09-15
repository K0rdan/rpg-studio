import { NextRequest, NextResponse } from 'next/server';
import type { AssetKind } from '@packages/types';
import { AssetNotFoundError } from '@packages/storage';
import { requireProjectAccess } from '@/lib/apiAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getTilesetStorage } from '@/lib/storage';
import { resolveAssetStorageKey } from '@/lib/assetStorage';

/** Replacing an asset image creates a new asset id, so bytes at a given URL never change. */
const IMMUTABLE_CACHE = 'private, max-age=31536000, immutable';

function isAssetKind(value: string): value is AssetKind {
  return value === 'tileset' || value === 'charset';
}

/**
 * GET /api/projects/[projectId]/assets/[kind]/[assetId]/image
 *
 * Streams the asset image from storage through the editor origin. Keeping the bytes
 * same-origin is what lets the tile palette read pixels from a canvas, and it keeps
 * storage signatures server-side instead of handing them to the browser.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; kind: string; assetId: string }> },
) {
  const notFound = NextResponse.json({ message: 'Asset image not found' }, { status: 404 });

  try {
    const { projectId, kind, assetId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    if (!isAssetKind(kind)) {
      return NextResponse.json({ message: 'Invalid asset kind' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const storageKey = await resolveAssetStorageKey(
      db,
      access.project,
      access.userId,
      kind,
      assetId,
    );
    if (!storageKey) {
      return notFound;
    }

    const file = await getTilesetStorage().downloadFile(storageKey);

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': String(file.data.byteLength),
        'Cache-Control': IMMUTABLE_CACHE,
        ...(file.etag ? { ETag: file.etag } : {}),
      },
    });
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return notFound;
    }

    console.error('Error serving asset image:', error);
    return NextResponse.json({ message: 'Asset storage unavailable' }, { status: 502 });
  }
}

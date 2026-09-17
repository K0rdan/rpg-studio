import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import type { AssetFolder, AssetFolders } from '@packages/types';
import { connectToDatabase } from '@/lib/mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';
import {
  assetFolderAncestors,
  isAssetFolderKind,
  listAssetFolders,
  normalizeAssetFolderPath,
} from '@/lib/assetFolders';

function parseFolder(value: unknown): AssetFolder | null {
  if (!value || typeof value !== 'object') return null;
  const { kind, path } = value as { kind?: unknown; path?: unknown };
  const normalizedPath = normalizeAssetFolderPath(path);
  if (!isAssetFolderKind(kind) || !normalizedPath) return null;
  return { kind, path: normalizedPath };
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const folders = access.project.assetFolders as AssetFolders | undefined;
  return NextResponse.json({
    tileset: listAssetFolders(folders, 'tileset'),
    charset: listAssetFolders(folders, 'charset'),
  } satisfies AssetFolders);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const folder = parseFolder(await request.json().catch(() => null));
  if (!folder) {
    return NextResponse.json({ message: 'A valid kind and non-empty path are required' }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const field = `assetFolders.${folder.kind}`;
  await db.collection<Document>('projects').updateOne(
    { _id: new ObjectId(projectId) },
    { $addToSet: { [field]: { $each: assetFolderAncestors(folder.path) } } },
  );

  return NextResponse.json(folder, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const folder = parseFolder(await request.json().catch(() => null));
  if (!folder) {
    return NextResponse.json({ message: 'A valid kind and non-empty path are required' }, { status: 400 });
  }

  const folders = listAssetFolders(
    access.project.assetFolders as AssetFolders | undefined,
    folder.kind,
  );
  const descendantPrefix = `${folder.path}/`;
  if (folders.some((path) => path.startsWith(descendantPrefix))) {
    return NextResponse.json({ message: 'Folder contains subfolders' }, { status: 409 });
  }

  const { db } = await connectToDatabase();
  const collectionName = folder.kind === 'tileset' ? 'tilesets' : 'sprites';
  const containedAsset = await db.collection(collectionName).findOne({
    projectId,
    folderPath: {
      $regex: `^${escapeRegularExpression(folder.path)}(?:/|$)`,
    },
  });
  if (containedAsset) {
    return NextResponse.json({ message: 'Folder contains assets' }, { status: 409 });
  }

  const field = `assetFolders.${folder.kind}`;
  await db.collection<Document>('projects').updateOne(
    { _id: new ObjectId(projectId) },
    { $pull: { [field]: folder.path } } as Document,
  );

  return new NextResponse(null, { status: 204 });
}

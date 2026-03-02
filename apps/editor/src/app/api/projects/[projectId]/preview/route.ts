import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const { db } = await connectToDatabase();

  try {
    // Fetch project
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      userId: session.user.id,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all maps (entities are embedded in maps)
    const maps = await db.collection('maps').find({
      _id: { $in: project.maps.map((id: string) => new ObjectId(id)) }
    }).toArray();

    // Fetch all tilesets
    const tilesets = await db.collection('tilesets').find({
      _id: { $in: project.tilesets.map((id: string) => new ObjectId(id)) }
    }).toArray();

    // Convert ObjectIds to strings for JSON serialization
    const formattedMaps = maps.map(m => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
      tilesetId: m.tilesetId,
      entities: m.entities || [], // Ensure entities array exists
    }));

    const formattedTilesets = tilesets.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: undefined,
    }));

    // Return preview data
    return NextResponse.json({
      project: {
        id: project._id.toString(),
        name: project.name,
      },
      maps: formattedMaps,
      tilesets: formattedTilesets,
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview data' },
      { status: 500 }
    );
  }
}

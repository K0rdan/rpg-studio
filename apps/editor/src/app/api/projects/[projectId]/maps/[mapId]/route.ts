import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { mapId } = await params;

    const map = await db.collection('maps').findOne({ _id: new ObjectId(mapId) });

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    const formattedMap = {
      ...map,
      id: map._id.toHexString(),
    };

    return NextResponse.json(formattedMap, { status: 200 });
  } catch (error) {
    console.error('Error fetching map:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  try {
    const { auth } = await import('@/lib/auth');
    const { headers } = await import('next/headers');
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { projectId, mapId } = await params;
    const updates = await req.json();

    // Verify project ownership
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      userId: session.user.id,
    });

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found or unauthorized' },
        { status: 403 }
      );
    }

    // Remove id from updates if present to avoid immutable field error
    delete updates.id;
    delete updates._id;

    // Add updatedAt timestamp
    updates.updatedAt = new Date();

    // Update map (maps don't have projectId field, only _id)
    const result = await db.collection('maps').updateOne(
      { _id: new ObjectId(mapId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Map saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating map:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { projectId, mapId } = await params;

    const result = await db.collection('maps').deleteOne({ _id: new ObjectId(mapId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    // Remove map from project
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { maps: mapId } } as any
    );

    return NextResponse.json({ message: 'Map deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting map:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  try {
    const { projectId, mapId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();

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
    const { projectId, mapId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const updates = await req.json();

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

    // Return the updated map document
    const updatedMap = await db.collection('maps').findOne({ _id: new ObjectId(mapId) });
    return NextResponse.json({ ...updatedMap, id: mapId }, { status: 200 });
  } catch (error) {
    console.error('Error updating map:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  try {
    const { projectId, mapId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();

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

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/projects/:projectId/maps/:mapId/entities
// Get all entities for a map
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; mapId: string }> }
) {
  try {
    const { db } = await connectToDatabase();
    const { mapId } = await params;

    const map = await db.collection('maps').findOne(
      { _id: new ObjectId(mapId) },
      { projection: { entities: 1 } }
    );

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    // Return entities array (or empty array if not set)
    const entities = map.entities || [];

    return NextResponse.json(entities, { status: 200 });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/projects/:projectId/maps/:mapId/entities
// Add a new entity to the map
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; mapId: string }> }
) {
  try {
    const { auth } = await import('@/lib/auth');
    const { headers } = await import('next/headers');
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { projectId, mapId } = await params;
    const entity = await req.json();

    // Verify project ownership
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      userId: session.user.id,
    });

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify map exists and belongs to project
    // Maps don't have projectId field - they're referenced in project.maps array
    if (!project.maps || !project.maps.includes(mapId)) {
      return NextResponse.json({ message: 'Map not found in project' }, { status: 404 });
    }

    const map = await db.collection('maps').findOne({
      _id: new ObjectId(mapId),
    });

    if (!map) {
      return NextResponse.json({ message: 'Map not found' }, { status: 404 });
    }

    // Generate ID for new entity if not provided
    const entityWithId = {
      ...entity,
      id: entity.id || new ObjectId().toString(),
    };

    // Add entity to map's entities array
    const result = await db.collection('maps').updateOne(
      { _id: new ObjectId(mapId) },
      { $push: { entities: entityWithId } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: 'Failed to add entity' }, { status: 500 });
    }

    return NextResponse.json(entityWithId, { status: 201 });
  } catch (error) {
    console.error('Error adding entity:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

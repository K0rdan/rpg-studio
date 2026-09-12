import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

// GET /api/projects/:projectId/maps/:mapId/entities
// Get all entities for a map
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; mapId: string }> }
) {
  try {
    const { projectId, mapId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();

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
    const { projectId, mapId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;
    const entity = await req.json();

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

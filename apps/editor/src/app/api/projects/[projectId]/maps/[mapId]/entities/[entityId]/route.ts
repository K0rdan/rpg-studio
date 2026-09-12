import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

// PUT /api/projects/:projectId/maps/:mapId/entities/:entityId
// Update an existing entity
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; mapId: string; entityId: string }> }
) {
  try {
    const { projectId, mapId, entityId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;
    const updatedEntity = await req.json();

    // Verify map belongs to project
    if (!project.maps || !project.maps.includes(mapId)) {
      return NextResponse.json({ message: 'Map not found in project' }, { status: 404 });
    }

    // Update entity in map's entities array
    const result = await db.collection('maps').updateOne(
      {
        _id: new ObjectId(mapId),
        'entities.id': entityId,
      },
      {
        $set: {
          'entities.$': updatedEntity,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Entity not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEntity, { status: 200 });
  } catch (error) {
    console.error('Error updating entity:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/projects/:projectId/maps/:mapId/entities/:entityId
// Delete an entity
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; mapId: string; entityId: string }> }
) {
  try {
    const { projectId, mapId, entityId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;

    // Verify map belongs to project
    if (!project.maps || !project.maps.includes(mapId)) {
      return NextResponse.json({ message: 'Map not found in project' }, { status: 404 });
    }

    // Remove entity from map's entities array
    const result = await db.collection('maps').updateOne(
      {
        _id: new ObjectId(mapId),
      },
      {
        $pull: { entities: { id: entityId } } as any,
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: 'Entity not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Entity deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting entity:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

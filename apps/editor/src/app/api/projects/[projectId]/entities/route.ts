import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Entity } from '@packages/types';
import { requireProjectAccess } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const entityIds = (access.project.entities || []).map((id: string) => new ObjectId(id));
    
    if (entityIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const entities = await db.collection('entities').find({ _id: { $in: entityIds } }).toArray();

    const formattedEntities = entities.map((entity) => ({
      ...entity,
      id: entity._id.toHexString(),
    }));

    return NextResponse.json(formattedEntities, { status: 200 });
  } catch (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

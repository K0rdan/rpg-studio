import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Entity } from '@packages/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { projectId } = await params;

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const entityIds = (project.entities || []).map((id: string) => new ObjectId(id));
    
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

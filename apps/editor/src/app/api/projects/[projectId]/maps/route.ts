import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Map } from '@packages/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { name, width, height } = await req.json();
    const { projectId } = await params;

    if (!name || !width || !height) {
      return NextResponse.json({ message: 'Map name, width, and height are required' }, { status: 400 });
    }

    const newMap: Omit<Map, 'id'> = {
      name,
      width,
      height,
      layers: [],
    };

    const mapsCollection = db.collection('maps');
    const result = await mapsCollection.insertOne(newMap);
    const newMapId = result.insertedId;

    const projectsCollection = db.collection('projects');
    await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { maps: newMapId.toHexString() } } as any
    );

    const insertedMap: Map = {
      ...newMap,
      id: newMapId.toHexString(),
    };

    return NextResponse.json(insertedMap, { status: 201 });
  } catch (error) {
    console.error('Error creating map:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { projectId } = await params;

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const mapIds = (project.maps || []).map((id: string) => new ObjectId(id));
    
    if (mapIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const maps = await db.collection('maps').find({ _id: { $in: mapIds } }).toArray();

    const formattedMaps = maps.map((map) => ({
      ...map,
      id: map._id.toHexString(),
    }));

    return NextResponse.json(formattedMaps, { status: 200 });
  } catch (error) {
    console.error('Error fetching maps:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

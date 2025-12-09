import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { projectId } = await params;

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const mapIds = (project.maps || []).map((id: string) => new ObjectId(id));
    const maps = await db.collection('maps').find({ _id: { $in: mapIds } }).toArray();

    // Format IDs and remove _id to avoid serialization issues
    const { _id: pid, ...projectRest } = project;
    const formattedProject = { ...projectRest, id: pid.toHexString() };
    
    const formattedMaps = maps.map((map) => {
        const { _id: mid, ...mapRest } = map;
        return { ...mapRest, id: mid.toHexString() };
    });

    // Mock tilesets for now (same as tilesets api)
    const tilesets = [
      {
        id: 'ts1',
        name: 'Fixed Tileset',
        image_source: '/tileset_fixed.png',
        tile_width: 128,
        tile_height: 128,
      }
    ];

    return NextResponse.json({
      project: formattedProject,
      maps: formattedMaps,
      tilesets
    });

  } catch (error) {
    console.error('Error fetching preview data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

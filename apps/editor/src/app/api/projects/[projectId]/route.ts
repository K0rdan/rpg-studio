import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const formattedProject = {
      ...access.project,
      id: access.project._id.toHexString(),
    };

    return NextResponse.json(formattedProject, { status: 200 });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;

    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    const { db } = await connectToDatabase();
    const { project } = access;

    // Delete associated maps
    if (project.maps && project.maps.length > 0) {
      const mapIds = project.maps.map((id: string) => new ObjectId(id));
      await db.collection('maps').deleteMany({ _id: { $in: mapIds } });
    }

    // Delete associated characters
    if (project.characters && project.characters.length > 0) {
      const charIds = project.characters.map((id: string) => new ObjectId(id));
      await db.collection('characters').deleteMany({ _id: { $in: charIds } });
    }

    // Delete the project
    await db.collection('projects').deleteOne({ _id: new ObjectId(projectId) });

    return NextResponse.json({ message: 'Project deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

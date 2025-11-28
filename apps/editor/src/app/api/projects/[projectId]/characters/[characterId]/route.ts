import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string; characterId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { characterId } = await params;
    const updates = await req.json();

    // Remove id from updates if present
    delete updates.id;
    delete updates._id;

    const result = await db.collection('characters').updateOne(
      { _id: new ObjectId(characterId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Character not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Character updated' }, { status: 200 });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string; characterId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { projectId, characterId } = await params;

    const result = await db.collection('characters').deleteOne({ _id: new ObjectId(characterId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Character not found' }, { status: 404 });
    }

    // Remove character from project
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { characters: characterId } } as any
    );

    return NextResponse.json({ message: 'Character deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

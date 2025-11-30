import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Character } from '@packages/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { db } = await connectToDatabase();
    const { name, hp, attack, defense } = await req.json();
    const { projectId } = await params;

    if (!name) {
      return NextResponse.json({ message: 'Character name is required' }, { status: 400 });
    }

    const newCharacter: Omit<Character, 'id'> = {
      name,
      hp: hp || 100,
      maxHp: hp || 100,
      attack: attack || 10,
      defense: defense || 10,
      spriteId: '', // Default empty sprite
    };

    const charactersCollection = db.collection('characters');
    const result = await charactersCollection.insertOne(newCharacter);
    const newCharacterId = result.insertedId;

    const projectsCollection = db.collection('projects');
    await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { characters: newCharacterId.toHexString() } } as any
    );

    const insertedCharacter: Character = {
      ...newCharacter,
      id: newCharacterId.toHexString(),
    };

    return NextResponse.json(insertedCharacter, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
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

    const characterIds = (project.characters || []).map((id: string) => new ObjectId(id));
    
    if (characterIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const characters = await db.collection('characters').find({ _id: { $in: characterIds } }).toArray();

    const formattedCharacters = characters.map((char) => ({
      ...char,
      id: char._id.toHexString(),
    }));

    return NextResponse.json(formattedCharacters, { status: 200 });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

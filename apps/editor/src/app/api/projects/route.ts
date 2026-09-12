import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { GameProject } from '@packages/types';
import { requireApiSession } from '@/lib/apiAuth';

export async function GET() {
  try {
    const session = await requireApiSession();
    if (!session.ok) {
      return session.response;
    }

    const { db } = await connectToDatabase();
    // Filter projects by authenticated user
    const projects = await db.collection('projects').find({ userId: session.userId }).toArray();
    const formattedProjects = projects.map((project) => ({
      ...project,
      id: project._id.toHexString(),
    }));
    return NextResponse.json(formattedProjects, { status: 200 });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    if (!session.ok) {
      return session.response;
    }

    const { db } = await connectToDatabase();
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ message: 'Project name is required' }, { status: 400 });
    }

    const newProject: Omit<GameProject, 'id'> = {
      name,
      maps: [],
      characters: [],
      userId: session.userId,
    };

    const result = await db.collection('projects').insertOne(newProject);

    const insertedProject: GameProject = {
      ...newProject,
      id: result.insertedId.toHexString(),
    };

    return NextResponse.json(insertedProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
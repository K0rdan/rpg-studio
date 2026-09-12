import { NextResponse } from 'next/server';
import { ObjectId, type WithId, type Document } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from '@/lib/session';

type Denied = { ok: false; response: NextResponse };

export type ApiSession = { ok: true; userId: string } | Denied;

export type ProjectAccess = { ok: true; userId: string; project: WithId<Document> } | Denied;

/**
 * Session guard for route handlers. Unlike pages they answer with 401 instead of a redirect;
 * `apiFetch` on the client turns that into a trip to the login screen.
 */
export async function requireApiSession(): Promise<ApiSession> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true, userId: session.user.id };
}

/**
 * Session guard for routes scoped to one project: also loads the project and rejects users who
 * don't own it. Projects created before ownership was recorded have no `userId` and stay readable.
 */
export async function requireProjectAccess(projectId: string): Promise<ProjectAccess> {
  const session = await requireApiSession();
  if (!session.ok) {
    return session;
  }

  const notFound: Denied = {
    ok: false,
    response: NextResponse.json({ message: 'Project not found' }, { status: 404 }),
  };

  if (!ObjectId.isValid(projectId)) {
    return notFound;
  }

  const { db } = await connectToDatabase();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    return notFound;
  }

  const ownerId = project.userId instanceof ObjectId ? project.userId.toHexString() : project.userId;
  if (ownerId && ownerId !== session.userId) {
    return { ok: false, response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, userId: session.userId, project };
}

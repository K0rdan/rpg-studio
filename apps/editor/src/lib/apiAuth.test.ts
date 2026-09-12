import { MongoClient, Db, ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { createMongoClient } from '@/lib/mongoClient';
import { requireApiSession, requireProjectAccess } from '@/lib/apiAuth';

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

const mockedConnectToDatabase = connectToDatabase as jest.Mock;
const mockedGetSession = auth.api.getSession as unknown as jest.Mock;

describe('API auth guards', () => {
  let connection: MongoClient;
  let db: Db;
  const userId = 'test-user-123';

  beforeAll(async () => {
    connection = createMongoClient(globalThis.__ATLAS_URI__!);
    await connection.connect();
    db = connection.db(globalThis.__ATLAS_DATABASE_NAME__!);
    mockedConnectToDatabase.mockResolvedValue({ db });
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    mockedGetSession.mockResolvedValue({ user: { id: userId } });
    await db.collection('projects').deleteMany({});
  });

  describe('requireApiSession', () => {
    it('answers 401 when there is no session', async () => {
      mockedGetSession.mockResolvedValue(null);

      const result = await requireApiSession();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it('answers 401 when the session lookup throws', async () => {
      mockedGetSession.mockRejectedValue(new Error('session store unreachable'));

      const result = await requireApiSession();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it('returns the user id for a valid session', async () => {
      const result = await requireApiSession();

      expect(result).toEqual({ ok: true, userId });
    });
  });

  describe('requireProjectAccess', () => {
    const insertProject = async (owner?: string) => {
      const result = await db.collection('projects').insertOne({
        name: 'Test Project',
        ...(owner ? { userId: owner } : {}),
      });
      return result.insertedId.toHexString();
    };

    it('answers 401 before looking at the project when unauthenticated', async () => {
      mockedGetSession.mockResolvedValue(null);
      const projectId = await insertProject(userId);

      const result = await requireProjectAccess(projectId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(401);
      }
    });

    it('answers 404 for a malformed project id', async () => {
      const result = await requireProjectAccess('not-an-object-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(404);
      }
    });

    it('answers 404 for a project that does not exist', async () => {
      const result = await requireProjectAccess(new ObjectId().toHexString());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(404);
      }
    });

    it('answers 403 for a project owned by someone else', async () => {
      const projectId = await insertProject('another-user');

      const result = await requireProjectAccess(projectId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
      }
    });

    it('returns the project to its owner', async () => {
      const projectId = await insertProject(userId);

      const result = await requireProjectAccess(projectId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.userId).toBe(userId);
        expect(result.project.name).toBe('Test Project');
      }
    });

    it('allows projects created before ownership was recorded', async () => {
      const projectId = await insertProject();

      const result = await requireProjectAccess(projectId);

      expect(result.ok).toBe(true);
    });
  });
});

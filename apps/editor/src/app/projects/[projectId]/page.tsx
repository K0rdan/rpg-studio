import NewMap from '@/components/NewMap';
import MapList from '@/components/MapList';
import NewCharacter from '@/components/NewCharacter';
import CharacterList from '@/components/CharacterList';
import TilesetList from '@/components/TilesetList';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Map, Character } from '@packages/types';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { db } = await connectToDatabase();

  const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

  let maps: Map[] = [];
  let characters: Character[] = [];

  if (project) {
    const mapIds = (project.maps || []).map((id: string) => new ObjectId(id));
    if (mapIds.length > 0) {
      const mapDocs = await db.collection('maps').find({ _id: { $in: mapIds } }).toArray();
      maps = mapDocs.map((doc) => {
        const { _id, ...rest } = doc;
        return { ...rest, id: _id.toHexString() };
      }) as unknown as Map[];
    }

    const characterIds = (project.characters || []).map((id: string) => new ObjectId(id));
    if (characterIds.length > 0) {
      const charDocs = await db.collection('characters').find({ _id: { $in: characterIds } }).toArray();
      characters = charDocs.map((doc) => {
        const { _id, ...rest } = doc;
        return { ...rest, id: _id.toHexString() };
      }) as unknown as Character[];
    }
  }

  return (
    <main>
      <h1>Project Details</h1>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Maps</h2>
        <NewMap projectId={projectId} />
        <MapList projectId={projectId} maps={maps} />
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Characters</h2>
        <NewCharacter projectId={projectId} />
        <CharacterList projectId={projectId} characters={characters} />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4">Tilesets</h2>
        <TilesetList projectId={projectId} />
      </div>
    </main>
  );
}

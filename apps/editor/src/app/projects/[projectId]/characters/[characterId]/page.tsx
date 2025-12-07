import CharacterEditor from '@/components/CharacterEditor';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Character } from '@packages/types';

export default async function CharacterPage({ params }: { params: Promise<{ projectId: string; characterId: string }> }) {
  const { projectId, characterId } = await params;

  let characterData: Character | null = null;
  let error = '';

  try {
    const { db } = await connectToDatabase();
    const character = await db.collection('characters').findOne({ _id: new ObjectId(characterId) });

    if (character) {
      characterData = {
        ...character,
        id: character._id.toHexString(),
      } as unknown as Character;
    }
  } catch (e) {
    if (e instanceof Error) {
      error = e.message;
      console.error('Error fetching character:', e);
    } else {
      error = 'An unknown error occurred';
      console.error('Unknown error fetching character:', e);
    }
  }

  if (error) return <div className="error">Error: {error}</div>;
  if (!characterData) return <div>Character not found</div>;

  return (
    <main>
      <h1>Edit Character</h1>
      <CharacterEditor projectId={projectId} characterId={characterId} initialData={characterData} />
    </main>
  );
}

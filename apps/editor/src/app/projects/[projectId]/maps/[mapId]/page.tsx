import MapEditor from '@/components/MapEditor';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Map } from '@packages/types';

export default async function MapPage({ params }: { params: Promise<{ projectId: string; mapId: string }> }) {
  const { projectId, mapId } = await params;

  let mapData: Map | null = null;
  let error = '';

  try {
    const { db } = await connectToDatabase();
    const map = await db.collection('maps').findOne({ _id: new ObjectId(mapId) });

    if (map) {
      mapData = {
        ...map,
        id: map._id.toHexString(),
      } as unknown as Map; // Casting because _id is not in Map interface but we map it to id
    }
  } catch (e) {
    if (e instanceof Error) {
      error = e.message;
      console.error('Error fetching map:', e);
    } else {
      error = 'An unknown error occurred';
      console.error('Unknown error fetching map:', e);
    }
  }

  if (error) return <div className="error">Error: {error}</div>;
  if (!mapData) return <div>Map not found</div>;

  return (
    <main>
      <h1>Edit Map: {mapData.name}</h1>
      <MapEditor projectId={projectId} mapId={mapId} initialMapData={mapData} />
    </main>
  );
}

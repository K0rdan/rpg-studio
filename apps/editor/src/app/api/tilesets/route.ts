import { NextRequest, NextResponse } from 'next/server';
import { TILESETS } from '@/config/tilesets';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTilesetStorage } from '@/lib/storage';

/**
 * GET /api/tilesets?projectId=<projectId>
 * 
 * Returns available tilesets.
 * If projectId is provided, returns both static tilesets and project tilesets.
 * Otherwise, returns only static tilesets (for backward compatibility).
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    // Always include static tilesets
    const staticTilesets = TILESETS;

    // If projectId is provided, also fetch project tilesets
    if (projectId) {
      try {
        const { db } = await connectToDatabase();
        const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });

        if (project) {
          const tilesetIds = project.tilesets || [];
          if (tilesetIds.length > 0) {
            const tilesetsCollection = db.collection('tilesets');
            const projectTilesets = await tilesetsCollection
              .find({
                _id: { $in: tilesetIds.map((id: string) => new ObjectId(id)) },
                projectId,
              })
              .toArray();

            // Generate image URLs for project tilesets
            const storage = getTilesetStorage();
            const projectTilesetsWithUrls = await Promise.all(
              projectTilesets.map(async (tileset) => {
                try {
                  const imageUrl = await storage.getTilesetImageUrl({
                    location: { storageKey: tileset.storageLocation },
                  });

                  return {
                    id: tileset._id.toHexString(),
                    name: tileset.name,
                    image_source: imageUrl,
                    tile_width: tileset.tile_width,
                    tile_height: tileset.tile_height,
                  };
                } catch (error) {
                  console.error(`Failed to generate URL for tileset ${tileset._id}:`, error);
                  return null;
                }
              })
            );

            // Filter out nulls and combine with static tilesets
            const validProjectTilesets = projectTilesetsWithUrls.filter((t) => t !== null);
            return NextResponse.json([...staticTilesets, ...validProjectTilesets], { status: 200 });
          }
        }
      } catch (error) {
        console.error('Error fetching project tilesets:', error);
        // Fall through to return static tilesets only
      }
    }

    // Return only static tilesets
    return NextResponse.json(staticTilesets, { status: 200 });
  } catch (error) {
    console.error('Error fetching tilesets:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

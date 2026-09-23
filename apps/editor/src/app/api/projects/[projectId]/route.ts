import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireProjectAccess } from '@/lib/apiAuth';
import {
  isGenerationModelId,
  isProjectStyleSpec,
  type GenerationModelId,
  type ProjectStyleSpec,
} from '@packages/types';

function normalizeStyleSpec(value: unknown): ProjectStyleSpec | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const mood = typeof candidate.mood === 'string' ? candidate.mood.trim() : candidate.mood;
  const normalized = {
    tileSize: candidate.tileSize,
    perspective: candidate.perspective,
    ...(mood ? { mood } : {}),
  };
  return isProjectStyleSpec(normalized) ? normalized : null;
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.ok) {
      return access.response;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ message: 'Invalid update payload' }, { status: 400 });
    }

    const update = body as Record<string, unknown>;
    const hasStyleSpec = Object.prototype.hasOwnProperty.call(update, 'styleSpec');
    const hasGenerationModel = Object.prototype.hasOwnProperty.call(update, 'generationModel');
    if (!hasStyleSpec && !hasGenerationModel) {
      return NextResponse.json({ message: 'No supported fields to update' }, { status: 400 });
    }

    let styleSpec: ProjectStyleSpec | undefined;
    if (hasStyleSpec) {
      const normalized = normalizeStyleSpec(update.styleSpec);
      if (!normalized) {
        return NextResponse.json({ message: 'Invalid project style' }, { status: 400 });
      }
      styleSpec = normalized;
    }

    let generationModel: GenerationModelId | null | undefined;
    if (hasGenerationModel) {
      if (update.generationModel === null || update.generationModel === '') {
        generationModel = null;
      } else if (isGenerationModelId(update.generationModel)) {
        generationModel = update.generationModel;
      } else {
        return NextResponse.json({ message: 'Invalid generation model' }, { status: 400 });
      }
    }

    const { db } = await connectToDatabase();
    if (styleSpec) {
      const currentStyle = access.project.styleSpec as ProjectStyleSpec | undefined;
      const changesDimensions = Boolean(
        currentStyle
        && (
          currentStyle.tileSize !== styleSpec.tileSize
          || currentStyle.perspective !== styleSpec.perspective
        )
      );
      if (changesDimensions && update.confirmStyleChange !== true) {
        const acceptedFamily = await db.collection('tilesets').findOne({
          projectId,
          'generation_metadata.generated': true,
          'generation_metadata.role': 'family',
        });
        if (acceptedFamily) {
          return NextResponse.json(
            {
              message: 'Changing tile size or perspective requires confirmation because generated families already exist',
            },
            { status: 409 },
          );
        }
      }
    }

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};
    if (styleSpec) {
      $set.styleSpec = styleSpec;
    }
    if (generationModel === null) {
      $unset.generationModel = '';
    } else if (generationModel) {
      $set.generationModel = generationModel;
    }

    const project = await db.collection('projects').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        ...($set && Object.keys($set).length > 0 ? { $set } : {}),
        ...($unset && Object.keys($unset).length > 0 ? { $unset } : {}),
      },
      { returnDocument: 'after' },
    );
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...project,
      id: project._id.toHexString(),
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating project:', error);
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

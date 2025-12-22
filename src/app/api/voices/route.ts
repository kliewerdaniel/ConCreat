import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';

interface VoiceMetadata {
  id: string;
  name: string;
  description: string;
  filePath: string;
  isDefault: boolean;
  createdAt: string;
  type: 'uploaded' | 'built-in';
}

interface VoicesRegistry {
  voices: VoiceMetadata[];
}

const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');
const VOICES_JSON = path.join(VOICES_DIR, 'voices.json');

async function readVoicesRegistry(): Promise<VoicesRegistry> {
  try {
    const data = await readFile(VOICES_JSON, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default registry if file doesn't exist
    return {
      voices: [
        {
          id: "default_female",
          name: "Default Female",
          description: "Built-in female voice",
          filePath: "/female_voice.wav",
          isDefault: true,
          createdAt: "2025-01-01T00:00:00.000Z",
          type: "built-in"
        }
      ]
    };
  }
}

async function writeVoicesRegistry(registry: VoicesRegistry): Promise<void> {
  await writeFile(VOICES_JSON, JSON.stringify(registry, null, 2));
}

// GET /api/voices - List all voices
export async function GET(request: NextRequest) {
  try {
    const registry = await readVoicesRegistry();
    return NextResponse.json({
      success: true,
      voices: registry.voices
    });
  } catch (error) {
    console.error('Error reading voices registry:', error);
    return NextResponse.json({
      error: 'Failed to read voices registry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/voices - Update voice metadata
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    const registry = await readVoicesRegistry();
    const voiceIndex = registry.voices.findIndex(v => v.id === id);

    if (voiceIndex === -1) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    // Update voice metadata
    if (name && typeof name === 'string') {
      registry.voices[voiceIndex].name = name.trim();
    }
    if (description !== undefined) {
      registry.voices[voiceIndex].description = description?.trim() || '';
    }

    await writeVoicesRegistry(registry);

    return NextResponse.json({
      success: true,
      voice: registry.voices[voiceIndex]
    });

  } catch (error) {
    console.error('Error updating voice:', error);
    return NextResponse.json({
      error: 'Failed to update voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/voices?id=voiceId - Delete a voice
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
    }

    const registry = await readVoicesRegistry();
    const voiceIndex = registry.voices.findIndex(v => v.id === id);

    if (voiceIndex === -1) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    const voice = registry.voices[voiceIndex];

    // Don't allow deletion of default voices
    if (voice.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default voice' }, { status: 400 });
    }

    // Remove from registry
    registry.voices.splice(voiceIndex, 1);
    await writeVoicesRegistry(registry);

    // Delete the audio file
    try {
      const filePath = path.join(process.cwd(), 'public', voice.filePath);
      await unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete voice file:', fileError);
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'Voice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting voice:', error);
    return NextResponse.json({
      error: 'Failed to delete voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

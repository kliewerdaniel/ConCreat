import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
  // Ensure voices directory exists
  try {
    await mkdir(VOICES_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  await writeFile(VOICES_JSON, JSON.stringify(registry, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Voice name is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only WAV, MP3, OGG, and FLAC files are allowed'
      }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 50MB'
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name) || '.wav';
    const voiceId = uuidv4();
    const filename = `${voiceId}${fileExtension}`;
    const filePath = path.join(VOICES_DIR, filename);

    // Ensure voices directory exists
    try {
      await mkdir(VOICES_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Read current registry
    const registry = await readVoicesRegistry();

    // Create voice metadata
    const voiceMetadata: VoiceMetadata = {
      id: voiceId,
      name: name.trim(),
      description: description?.trim() || '',
      filePath: `/voices/${filename}`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      type: 'uploaded'
    };

    // Add to registry
    registry.voices.push(voiceMetadata);

    // Save updated registry
    await writeVoicesRegistry(registry);

    return NextResponse.json({
      success: true,
      voice: voiceMetadata
    });

  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface ImageData {
  filename: string;
  localPath?: string;
  localFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  isFavorite?: boolean;
  createdAt?: string;
  prompt_id?: string;
}

const IMAGE_DATA_FILE = join(process.cwd(), 'public', 'image-data.json');

export async function GET() {
  try {
    try {
      const data = await readFile(IMAGE_DATA_FILE, 'utf-8');
      const imageData: ImageData[] = JSON.parse(data);
      return NextResponse.json({ success: true, images: imageData });
    } catch (error) {
      // File doesn't exist yet, return empty array
      return NextResponse.json({ success: true, images: [] });
    }
  } catch (error) {
    console.error('Read Error:', error);
    return NextResponse.json({ error: 'Failed to read image data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newImage: ImageData = await request.json();

    let existingImages: ImageData[] = [];
    try {
      const data = await readFile(IMAGE_DATA_FILE, 'utf-8');
      existingImages = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Add new image (keep only last 10)
    const updatedImages = [newImage, ...existingImages.slice(0, 9)];

    await writeFile(IMAGE_DATA_FILE, JSON.stringify(updatedImages, null, 2));

    return NextResponse.json({ success: true, images: updatedImages });
  } catch (error) {
    console.error('Write Error:', error);
    return NextResponse.json({ error: 'Failed to save image data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updatedImages: ImageData[] = await request.json();

    await writeFile(IMAGE_DATA_FILE, JSON.stringify(updatedImages, null, 2));

    return NextResponse.json({ success: true, images: updatedImages });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Failed to update image data' }, { status: 500 });
  }
}

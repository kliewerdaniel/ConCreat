import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface VideoData {
  filename: string;
  localPath?: string;
  localFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  inputImage?: string;
  isFavorite?: boolean;
  createdAt?: string;
  prompt_id?: string;
}

const VIDEO_DATA_FILE = join(process.cwd(), 'public', 'video-data.json');

export async function GET() {
  try {
    try {
      const data = await readFile(VIDEO_DATA_FILE, 'utf-8');
      const videoData: VideoData[] = JSON.parse(data);
      return NextResponse.json({ success: true, videos: videoData });
    } catch (error) {
      // File doesn't exist yet, return empty array
      return NextResponse.json({ success: true, videos: [] });
    }
  } catch (error) {
    console.error('Read Error:', error);
    return NextResponse.json({ error: 'Failed to read video data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newVideo: VideoData = await request.json();

    let existingVideos: VideoData[] = [];
    try {
      const data = await readFile(VIDEO_DATA_FILE, 'utf-8');
      existingVideos = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Add new video (keep only last 10)
    const updatedVideos = [newVideo, ...existingVideos.slice(0, 9)];

    await writeFile(VIDEO_DATA_FILE, JSON.stringify(updatedVideos, null, 2));

    return NextResponse.json({ success: true, videos: updatedVideos });
  } catch (error) {
    console.error('Write Error:', error);
    return NextResponse.json({ error: 'Failed to save video data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updatedVideos: VideoData[] = await request.json();

    await writeFile(VIDEO_DATA_FILE, JSON.stringify(updatedVideos, null, 2));

    return NextResponse.json({ success: true, videos: updatedVideos });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Failed to update video data' }, { status: 500 });
  }
}

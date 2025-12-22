import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoBlob = formData.get('video') as Blob;
    const filename = formData.get('filename') as string || 'video.mp4';

    if (!videoBlob) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Ensure videos directory exists
    const videosDir = join(process.cwd(), 'public', 'videos');
    await mkdir(videosDir, { recursive: true });

    // Convert blob to buffer and save
    const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());
    const filePath = join(videosDir, filename);

    await writeFile(filePath, videoBuffer);

    return NextResponse.json({
      success: true,
      filename,
      url: `/videos/${filename}`
    });

  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const clearAll = searchParams.get('clearAll');

    const videosDir = join(process.cwd(), 'public', 'videos');

    if (clearAll === 'true') {
      // Clear all videos
      try {
        const files = await readdir(videosDir);
        const deletePromises = files.map(file => unlink(join(videosDir, file)));
        await Promise.all(deletePromises);
        return NextResponse.json({ success: true, message: 'All videos cleared' });
      } catch (error) {
        // Directory might not exist or be empty
        return NextResponse.json({ success: true, message: 'No videos to clear' });
      }
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required for deletion' }, { status: 400 });
    }

    // Delete specific video
    const filePath = join(videosDir, filename);
    await unlink(filePath);

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const videosDir = join(process.cwd(), 'public', 'videos');

    try {
      const files = await readdir(videosDir);
      const videoFiles = files.filter(file => file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov'));

      return NextResponse.json({
        success: true,
        videos: videoFiles.map(filename => ({
          filename,
          url: `/videos/${filename}`
        }))
      });
    } catch (error) {
      // Directory doesn't exist or is empty
      return NextResponse.json({ success: true, videos: [] });
    }
  } catch (error) {
    console.error('List Error:', error);
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 });
  }
}

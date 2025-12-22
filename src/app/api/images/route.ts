import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const clearAll = searchParams.get('clearAll');

    const imagesDir = join(process.cwd(), 'public', 'images');

    if (clearAll === 'true') {
      // Clear all images
      try {
        const files = await readdir(imagesDir);
        const deletePromises = files.map(file => unlink(join(imagesDir, file)));
        await Promise.all(deletePromises);
        return NextResponse.json({ success: true, message: 'All images cleared' });
      } catch (error) {
        // Directory might not exist or be empty
        return NextResponse.json({ success: true, message: 'No images to clear' });
      }
    }

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required for deletion' }, { status: 400 });
    }

    // Delete specific image
    const filePath = join(imagesDir, filename);
    await unlink(filePath);

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const imagesDir = join(process.cwd(), 'public', 'images');

    try {
      const files = await readdir(imagesDir);
      const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));

      return NextResponse.json({
        success: true,
        images: imageFiles.map(filename => ({
          filename,
          url: `/images/${filename}`
        }))
      });
    } catch (error) {
      // Directory doesn't exist or is empty
      return NextResponse.json({ success: true, images: [] });
    }
  } catch (error) {
    console.error('List Error:', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}

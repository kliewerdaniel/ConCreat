import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const COMFYUI_URL = 'http://localhost:8188';

export async function POST(request: NextRequest) {
  try {
    const { filename, subfolder } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Read image from local filesystem (Next.js public/images directory)
    const localImagePath = join(process.cwd(), 'public', 'images', filename);

    try {
      const imageBuffer = await readFile(localImagePath);

      // Upload to ComfyUI input directory
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'input_image.jpg');

      const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload image to ComfyUI: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);

      return NextResponse.json({
        success: true,
        uploadedFilename: uploadData.name || 'input_image.jpg'
      });

    } catch (fileError) {
      console.error('File read error:', fileError);
      // Fallback: try to fetch from ComfyUI output directory
      try {
        const imageResponse = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || 'image_maker_app')}&type=output`);

        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from ComfyUI: ${imageResponse.status}`);
        }

        const imageBlob = await imageResponse.blob();

        // Upload to ComfyUI input directory
        const formData = new FormData();
        formData.append('image', imageBlob, 'input_image.jpg');

        const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', uploadResponse.status, errorText);
          throw new Error(`Failed to upload image to ComfyUI: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('Upload response:', uploadData);

        return NextResponse.json({
          success: true,
          uploadedFilename: uploadData.name || 'input_image.jpg'
        });

      } catch (comfyError) {
        console.error('ComfyUI fallback error:', comfyError);
        throw new Error('Could not read image from local filesystem or ComfyUI');
      }
    }

  } catch (error) {
    console.error('Copy image error:', error);
    return NextResponse.json({ error: 'Failed to copy image' }, { status: 500 });
  }
}

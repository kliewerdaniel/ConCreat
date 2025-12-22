import { NextRequest, NextResponse } from 'next/server';

const COMFYUI_URL = 'http://localhost:8188';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert the file to a blob and upload to ComfyUI
    const uploadFormData = new FormData();
    uploadFormData.append('image', new Blob([await imageFile.arrayBuffer()], { type: imageFile.type }), 'input_image.jpg');

    const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('ComfyUI upload failed:', uploadResponse.status, errorText);
      throw new Error(`Failed to upload image to ComfyUI: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('ComfyUI upload response:', uploadData);

    return NextResponse.json({
      success: true,
      uploadedFilename: uploadData.name || 'input_image.jpg'
    });

  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

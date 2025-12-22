import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import fs from 'fs/promises';
import path from 'path';

const COMFYUI_URL = 'http://localhost:8188';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Send to ComfyUI
    const response = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to communicate with ComfyUI' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('prompt_id');
    const download = searchParams.get('download');
    const type = searchParams.get('type') || 'image'; // 'image' or 'video'

    if (download === 'true') {
      const filename = searchParams.get('filename');
      const subfolder = searchParams.get('subfolder');

      if (!filename || !subfolder) {
        return NextResponse.json({ error: 'Filename and subfolder are required for download' }, { status: 400 });
      }

      // Fetch file from ComfyUI
      console.log(`Attempting to fetch ${type} from ComfyUI: ${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`);
      const fileResponse = await fetch(`${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`);

      if (!fileResponse.ok) {
        console.error(`Failed to fetch ${type} from ComfyUI: ${fileResponse.status} ${fileResponse.statusText}`);
        const errorText = await fileResponse.text().catch(() => 'No error text available');
        console.error(`ComfyUI error response: ${errorText}`);

        // Try direct filesystem access for videos - much simpler approach
        if (type === 'video') {
          console.log('Video not found through ComfyUI view endpoint, copying from ComfyUI output directory...');

          try {
            // Direct path to ComfyUI output directory
            const comfyOutputDir = '/Users/danielkliewer/Documents/Projects/Com/output';

            console.log(`Checking ComfyUI output directory: ${comfyOutputDir}`);

            const files = await fs.readdir(comfyOutputDir);
            console.log(`Found ${files.length} files in ComfyUI output directory`);

            // Get file stats to find the most recent video files
            const videoFiles = [];

            // First check files directly in the output directory
            for (const file of files) {
              if (file.endsWith('.mp4') || file.endsWith('.gif')) {
                try {
                  const filePath = path.join(comfyOutputDir, file);
                  const stats = await fs.stat(filePath);
                  videoFiles.push({
                    name: file,
                    path: filePath,
                    mtime: stats.mtime.getTime()
                  });
                } catch (statError) {
                  console.log(`Could not stat file ${file}:`, statError);
                }
              }
            }

            // Also check the HV15Out subdirectory
            try {
              const hv15OutDir = path.join(comfyOutputDir, 'HV15Out');
              console.log(`Also checking HV15Out subdirectory: ${hv15OutDir}`);

              const hv15Files = await fs.readdir(hv15OutDir);
              console.log(`Found ${hv15Files.length} files in HV15Out subdirectory`);

              for (const file of hv15Files) {
                if (file.endsWith('.mp4') || file.endsWith('.gif')) {
                  try {
                    const filePath = path.join(hv15OutDir, file);
                    const stats = await fs.stat(filePath);
                    videoFiles.push({
                      name: file,
                      path: filePath,
                      mtime: stats.mtime.getTime()
                    });
                  } catch (statError) {
                    console.log(`Could not stat file ${file} in HV15Out:`, statError);
                  }
                }
              }
            } catch (hv15Error: unknown) {
              console.log(`Could not access HV15Out subdirectory:`, hv15Error instanceof Error ? hv15Error.message : String(hv15Error));
            }

            // Sort by modification time (newest first)
            videoFiles.sort((a, b) => b.mtime - a.mtime);

            console.log(`Found ${videoFiles.length} video files, newest: ${videoFiles[0]?.name || 'none'}`);

            if (videoFiles.length > 0) {
              // Copy the most recent video file
              const newestVideo = videoFiles[0];
              const fileBuffer = await fs.readFile(newestVideo.path);

              // Save to local videos directory
              const videosDir = join(process.cwd(), 'public', 'videos');
              await mkdir(videosDir, { recursive: true });

              const timestamp = Date.now();
              const localFilename = `generated_${timestamp}_${newestVideo.name}`;
              const localFilePath = join(videosDir, localFilename);

              await writeFile(localFilePath, fileBuffer);

              console.log(`Successfully copied video: ${newestVideo.name} -> ${localFilename}`);

              return NextResponse.json({
                success: true,
                localPath: `/videos/${localFilename}`,
                filename: localFilename
              });
            } else {
              console.log('No video files found in ComfyUI output directory');
            }
          } catch (fsError: unknown) {
            console.log('Filesystem access failed:', fsError instanceof Error ? fsError.message : String(fsError));
          }
        }

        throw new Error(`Failed to fetch ${type} from ComfyUI: ${fileResponse.status} - ${errorText}`);
      }

      const fileBuffer = await fileResponse.arrayBuffer();

      if (type === 'video') {
        // Ensure videos directory exists
        const videosDir = join(process.cwd(), 'public', 'videos');
        await mkdir(videosDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const localFilename = `generated_${timestamp}_${filename}`;
        const filePath = join(videosDir, localFilename);

        // Save video locally
        await writeFile(filePath, Buffer.from(fileBuffer));

        // Return local video info
        return NextResponse.json({
          success: true,
          localPath: `/videos/${localFilename}`,
          filename: localFilename
        });
      } else {
        // Handle images (existing logic)
        // Ensure images directory exists
        const imagesDir = join(process.cwd(), 'public', 'images');
        await mkdir(imagesDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const localFilename = `generated_${timestamp}_${filename}`;
        const filePath = join(imagesDir, localFilename);

        // Save image locally
        await writeFile(filePath, Buffer.from(fileBuffer));

        // Return local image info
        return NextResponse.json({
          success: true,
          localPath: `/images/${localFilename}`,
          filename: localFilename
        });
      }
    }

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 });
    }

    // Get history from ComfyUI
    const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);

    if (!response.ok) {
      throw new Error(`ComfyUI responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to get history from ComfyUI' }, { status: 500 });
  }
}

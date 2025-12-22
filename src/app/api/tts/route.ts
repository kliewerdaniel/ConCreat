import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { readFile } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // If voice is provided and looks like a voice ID (not a file path), look up the file path
    let voicePath = voice;
    if (voice && typeof voice === 'string' && !voice.startsWith('/')) {
      try {
        console.log('Looking up voice path for ID:', voice);
        const voicesFilePath = path.join(process.cwd(), 'public', 'voices', 'voices.json');
        const voicesContent = await readFile(voicesFilePath, 'utf-8');
        const voicesData = JSON.parse(voicesContent);
        console.log('Voices data:', voicesData);
        if (voicesData.voices) {
          const voiceData = voicesData.voices.find((v: { id: string; filePath: string }) => v.id === voice);
          if (voiceData) {
            voicePath = voiceData.filePath;
            console.log('Found voice path:', voicePath);
          } else {
            console.log('Voice not found in registry');
          }
        } else {
          console.log('No voices array in registry');
        }
      } catch (error) {
        console.warn('Failed to lookup voice path:', error);
      }
    }

    // Path to the Python TTS service and chatterbox venv
    const ttsServicePath = path.join(process.cwd(), 'tts_service.py');
    const chatterboxVenvPath = path.join(process.cwd(), 'tts_env_311', 'bin', 'python');

    return new Promise((resolve) => {
      // Prepare arguments for Python process
      const args = [ttsServicePath, text];
      if (voicePath && typeof voicePath === 'string') {
        args.push(voicePath);
      }

      console.log('Starting TTS process with args:', args);
      console.log('HF_TOKEN available:', !!process.env.HF_TOKEN);

      // Spawn Python process using chatterbox venv
      const pythonProcess = spawn(chatterboxVenvPath, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000, // 5 minute timeout
        env: {
          ...process.env,
          HF_TOKEN: process.env.HF_TOKEN // Pass HF_TOKEN to Python process
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('TTS stderr:', data.toString().trim());
      });

      pythonProcess.on('close', (code) => {
        console.log('TTS process exited with code:', code);
        console.log('Full stdout:', stdout);
        console.log('Full stderr:', stderr);

        if (code !== 0) {
          console.error('TTS process exited with code:', code);
          console.error('stderr:', stderr);
          resolve(NextResponse.json({
            error: 'TTS generation failed',
            details: stderr
          }, { status: 500 }));
          return;
        }

        // Extract JSON from stdout - look for the last complete JSON object
        const lines = stdout.trim().split('\n');
        let jsonResult = null;

        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            try {
              jsonResult = JSON.parse(line);
              console.log('Found JSON result:', jsonResult);
              break;
            } catch (e) {
              console.log('Failed to parse line as JSON:', line);
              continue;
            }
          }
        }

        if (jsonResult) {
          if (jsonResult.success) {
            resolve(NextResponse.json({
              audio: jsonResult.audio,
              sampleRate: jsonResult.sample_rate,
              format: jsonResult.format
            }));
          } else {
            resolve(NextResponse.json({
              error: jsonResult.error || 'TTS generation failed'
            }, { status: 500 }));
          }
        } else {
          console.error('No valid JSON found in stdout');
          resolve(NextResponse.json({
            error: 'Invalid TTS response format',
            details: stdout
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start TTS process:', error);
        resolve(NextResponse.json({
          error: 'Failed to start TTS service',
          details: error.message
        }, { status: 500 }));
      });

      // Set a timeout for the process
      setTimeout(() => {
        pythonProcess.kill();
        resolve(NextResponse.json({
          error: 'TTS request timed out'
        }, { status: 408 }));
      }, 300000); // 5 minutes
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

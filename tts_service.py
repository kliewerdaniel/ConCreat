#!/usr/bin/env python3
import sys
import json
import base64
import io
import os
import numpy as np

# Add the chatterbox source directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'chatterbox', 'src'))

class TTSService:
    def __init__(self):
        self.model = None
        self.vc_model = None
        self.sample_rate = 24000
        self.female_voice_path = os.path.join(os.path.dirname(__file__), 'female_voice.wav')

        # Try to initialize Chatterbox-Turbo, but fall back to mock if it fails
        try:
            print("Attempting to load Chatterbox-Turbo TTS model...", file=sys.stderr)
            import torch
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            # Automatically detect the best available device
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

            print(f"Using device: {device}", file=sys.stderr)

            # Temporarily redirect stdout to stderr during model loading to prevent JSON corruption
            old_stdout = os.dup(1)  # Duplicate stdout
            os.dup2(2, 1)  # Redirect stdout to stderr

            try:
                # Use Hugging Face token from environment if available
                if "HF_TOKEN" not in os.environ:
                    print("Warning: HF_TOKEN not set. Model loading may fail.", file=sys.stderr)
                self.model = ChatterboxTurboTTS.from_pretrained(device=device)
                self.sample_rate = self.model.sr

                # Initialize voice conversion model (Turbo doesn't have VC yet, but keep for compatibility)
                self.vc_model = None

                print("Chatterbox-Turbo TTS model loaded successfully", file=sys.stderr)
            finally:
                # Restore stdout
                os.dup2(old_stdout, 1)
                os.close(old_stdout)

        except Exception as e:
            print(f"Chatterbox TTS failed to load: {e}", file=sys.stderr)
            print("Falling back to mock TTS", file=sys.stderr)
            self.model = None
            self.vc_model = None

    def generate_speech(self, text, voice_path=None):
        if not text or not text.strip():
            return {
                'success': False,
                'error': 'Text cannot be empty'
            }

        try:
            if self.model:
                # Temporarily redirect stdout to stderr during TTS generation to prevent JSON corruption
                old_stdout = os.dup(1)  # Duplicate stdout
                os.dup2(2, 1)  # Redirect stdout to stderr

                try:
                    # Suppress all output during model generation
                    import contextlib
                    with contextlib.redirect_stdout(open(os.devnull, 'w')):
                        with contextlib.redirect_stderr(open(os.devnull, 'w')):
                            # Check if reference audio file exists, otherwise generate without it
                            if os.path.exists(self.female_voice_path):
                                print(f"Using reference audio: {self.female_voice_path}", file=sys.stderr)
                                wav = self.model.generate(text.strip(), audio_prompt_path=self.female_voice_path)
                            else:
                                print("No reference audio found, generating with default voice", file=sys.stderr)
                                wav = self.model.generate(text.strip())
                finally:
                    # Restore stdout after TTS generation
                    os.dup2(old_stdout, 1)
                    os.close(old_stdout)

                # For Chatterbox-Turbo, if a custom voice is specified, use it for voice cloning
                if voice_path and os.path.exists(voice_path):
                    try:
                        print(f"Using custom voice for cloning: {voice_path}", file=sys.stderr)
                        with contextlib.redirect_stdout(open(os.devnull, 'w')):
                            with contextlib.redirect_stderr(open(os.devnull, 'w')):
                                wav = self.model.generate(text.strip(), audio_prompt_path=voice_path)
                        print("Voice cloning applied successfully", file=sys.stderr)
                    except Exception as vc_error:
                        print(f"Voice cloning failed, using default voice: {vc_error}", file=sys.stderr)
                        # Fall back to default voice if cloning fails
                        with contextlib.redirect_stdout(open(os.devnull, 'w')):
                            with contextlib.redirect_stderr(open(os.devnull, 'w')):
                                wav = self.model.generate(text.strip())

                # Convert to WAV bytes using scipy instead of torchaudio
                try:
                    import scipy.io.wavfile
                    # Convert tensor to numpy array
                    audio_np = wav.squeeze(0).numpy()

                    # Save to temporary buffer
                    buffer = io.BytesIO()
                    scipy.io.wavfile.write(buffer, self.sample_rate, audio_np)
                    buffer.seek(0)

                    # Convert to base64 for JSON response
                    audio_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                except ImportError:
                    # Fallback to simple WAV format if scipy not available
                    import struct
                    audio_np = wav.squeeze(0).numpy()
                    audio_np = (audio_np * 32767).astype(np.int16)  # Convert to 16-bit PCM

                    # Create WAV header
                    num_channels = 1
                    sample_width = 2  # 16-bit
                    num_frames = len(audio_np)

                    wav_header = b'RIFF' + struct.pack('<L', 36 + num_frames * sample_width) + \
                               b'WAVEfmt ' + struct.pack('<LHHLLHH', 16, 1, num_channels, self.sample_rate,
                                                        self.sample_rate * sample_width, sample_width, 16) + \
                               b'data' + struct.pack('<L', num_frames * sample_width)

                    # Combine header and data
                    wav_data = wav_header + audio_np.tobytes()

                    # Convert to base64 for JSON response
                    audio_base64 = base64.b64encode(wav_data).decode('utf-8')

                return {
                    'success': True,
                    'audio': audio_base64,
                    'sample_rate': self.sample_rate,
                    'format': 'wav'
                }
            else:
                # Generate mock audio (simple sine wave with fade in/out)
                duration = min(max(len(text) * 0.15, 1.5), 4.0)  # Min 1.5s, 0.15s per character, max 4s
                samples = int(self.sample_rate * duration)
                t = np.linspace(0, duration, samples, False)

                # Create a more pleasant sound with multiple harmonics and fade
                base_freq = 180 + (hash(text) % 100)  # Base frequency based on text content
                audio_data = np.zeros(samples, dtype=np.float32)

                # Add fundamental and harmonics for richer sound
                for harmonic in [1, 2, 3]:
                    freq = base_freq * harmonic
                    amplitude = 1.0 / harmonic  # Fundamental is loudest
                    audio_data += amplitude * np.sin(2 * np.pi * freq * t)

                # Add some vibrato for more natural sound
                vibrato_rate = 5.0  # Hz
                vibrato_depth = 0.02  # Small modulation
                vibrato = 1 + vibrato_depth * np.sin(2 * np.pi * vibrato_rate * t)
                audio_data *= vibrato

                # Apply fade in/out to avoid clicks
                fade_samples = int(0.1 * self.sample_rate)  # 100ms fade
                if fade_samples > 0:
                    fade_in = np.linspace(0, 1, fade_samples)
                    fade_out = np.linspace(1, 0, fade_samples)
                    audio_data[:fade_samples] *= fade_in
                    audio_data[-fade_samples:] *= fade_out

                # Normalize to prevent clipping
                max_val = np.max(np.abs(audio_data))
                if max_val > 0:
                    audio_data /= max_val
                    audio_data *= 0.8  # Leave some headroom

                # Convert to WAV bytes using scipy
                try:
                    import scipy.io.wavfile
                    # Save to temporary buffer
                    buffer = io.BytesIO()
                    scipy.io.wavfile.write(buffer, self.sample_rate, audio_data)
                    buffer.seek(0)

                    # Convert to base64 for JSON response
                    audio_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                except ImportError:
                    # Fallback to simple WAV format if scipy not available
                    import struct
                    audio_np = (audio_data * 32767).astype(np.int16)  # Convert to 16-bit PCM

                    # Create WAV header
                    num_channels = 1
                    sample_width = 2  # 16-bit
                    num_frames = len(audio_np)

                    wav_header = b'RIFF' + struct.pack('<L', 36 + num_frames * sample_width) + \
                               b'WAVEfmt ' + struct.pack('<LHHLLHH', 16, 1, num_channels, self.sample_rate,
                                                        self.sample_rate * sample_width, sample_width, 16) + \
                               b'data' + struct.pack('<L', num_frames * sample_width)

                    # Combine header and data
                    wav_data = wav_header + audio_np.tobytes()

                    # Convert to base64 for JSON response
                    audio_base64 = base64.b64encode(wav_data).decode('utf-8')

                return {
                    'success': True,
                    'audio': audio_base64,
                    'sample_rate': self.sample_rate,
                    'format': 'wav',
                    'mock': True  # Indicate this is mock audio
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Global service instance - initialize once
tts_service = None

def get_tts_service():
    global tts_service
    if tts_service is None:
        print("Initializing TTS service...", file=sys.stderr)
        try:
            tts_service = TTSService()
            print("TTS service initialized successfully", file=sys.stderr)
        except Exception as e:
            print(f"Failed to initialize TTS service: {e}", file=sys.stderr)
            tts_service = None
    return tts_service

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No text provided'}))
        sys.exit(1)

    text = sys.argv[1]
    voice_path = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Received text: {text}", file=sys.stderr)
    print(f"Received voice_path: {voice_path}", file=sys.stderr)

    # Convert relative voice path to absolute if provided
    if voice_path:
        voice_path = os.path.join(os.path.dirname(__file__), 'public', voice_path.lstrip('/'))
        print(f"Converted voice_path to: {voice_path}", file=sys.stderr)
        print(f"Voice file exists: {os.path.exists(voice_path)}", file=sys.stderr)

    service = get_tts_service()
    if service:
        result = service.generate_speech(text, voice_path)
    else:
        result = {'success': False, 'error': 'TTS service failed to initialize'}
    print(json.dumps(result))

if __name__ == '__main__':
    main()

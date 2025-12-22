# ConCreat App

A modern web application for creating and managing multimedia content, featuring AI-powered text-to-speech capabilities using Chatterbox-Turbo.

## Features

- 🎨 **Image Generation**: Create and manage images
- 🎬 **Video Processing**: Handle video content and workflows
- 🗣️ **Text-to-Speech**: Convert text to natural-sounding speech using Chatterbox-Turbo
- 🎵 **Voice Cloning**: Clone voices for personalized audio content
- 📱 **Modern UI**: Built with Next.js, React, and Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ConCreat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   This will automatically set up the Python virtual environment and install required packages.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Manual Setup (Alternative)

If you prefer to set up manually:

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Create Python virtual environment:**
   ```bash
   python3 -m venv tts_env
   source tts_env/bin/activate  # On Windows: tts_env\Scripts\activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install chatterbox-tts torch torchaudio scipy
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

## Project Structure

```
ConCreat/
├── src/
│   └── app/
│       ├── api/
│       │   ├── chat/          # Chat API endpoints
│       │   ├── generate/      # Content generation APIs
│       │   ├── images/        # Image processing APIs
│       │   ├── tts/           # Text-to-speech API
│       │   ├── videos/        # Video processing APIs
│       │   └── voices/        # Voice management APIs
│       ├── globals.css        # Global styles
│       ├── layout.tsx         # Root layout
│       └── page.tsx           # Home page
├── public/                    # Static assets
├── workflows/                 # Workflow configurations
├── tts_service.py             # Python TTS service
├── package.json               # Node.js dependencies and scripts
└── README.md                  # This file
```

## API Endpoints

- `GET/POST /api/chat` - Chat functionality
- `POST /api/generate` - Content generation
- `GET/POST /api/images` - Image operations
- `POST /api/tts` - Text-to-speech conversion
- `GET/POST /api/videos` - Video operations
- `GET/POST /api/voices` - Voice management

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Optional: Hugging Face token for better model access
HF_TOKEN=your_huggingface_token_here
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup` - Full setup (install deps + Python env)

### Code Quality

This project uses:
- **ESLint** for JavaScript/TypeScript linting
- **TypeScript** for type safety
- **Tailwind CSS** for styling

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Technologies Used

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Python
- **AI/ML:** Chatterbox-Turbo TTS, PyTorch
- **Deployment:** Vercel (recommended)

# ConCreat App

![ConCreat App Screenshot](ss.png)

A cutting-edge web application designed for creating and managing multimedia content with integrated AI-powered text-to-speech capabilities through Chatterbox.

## 🚀 Features

- **🎨 Image Generation**: Advanced tools for creating and manipulating images using ComfyUI workflows
- **🎬 Video Processing**: Comprehensive video content handling and workflow management with HunyuanVideo integration
- **🗣️ Text-to-Speech**: Natural-sounding voice synthesis using Chatterbox technology
- **🎵 Voice Cloning**: Personalized audio content through voice replication
- **📱 Modern Interface**: Sleek UI built with Next.js, React, and Tailwind CSS
- **🔗 ComfyUI Integration**: Node-based AI workflows for advanced image and video generation

## 🤖 ComfyUI Integration

ConCreat leverages [ComfyUI](https://github.com/comfyanonymous/ComfyUI), a powerful node-based interface for AI image and video generation, to provide advanced creative tools.

### Included Workflows

- **Image Generation Workflow** (`workflows/imagemaker.json`): Advanced image creation using GGUF models like z_image_turbo, with support for LoRA models and custom prompts
- **Video Generation Workflow** (`workflows/video.json`): Video creation using HunyuanVideo15 models for high-quality video generation from images

### Workflow Features

- **GGUF Model Support**: Optimized quantized models for efficient inference
- **Customizable Pipelines**: Node-based workflows that can be modified and extended
- **High-Quality Output**: Support for various image and video formats with configurable quality settings
- **Prompt Engineering**: Advanced text encoding with positive and negative prompts

### ComfyUI Model Requirements

To use the included ComfyUI workflows, you'll need to download the following models and place them in your ComfyUI models directory:

#### Required Models for Image Generation (`workflows/imagemaker.json`):

- **VAE Model**: `ae.safetensors`
  - Download from: [Hugging Face](https://huggingface.co/stabilityai/sd-vae-ft-mse-original/blob/main/vae-ft-mse-840000-ema-pruned.safetensors)
  - Place in: `ComfyUI/models/vae/`

- **CLIP Model**: `Qwen3-4B-UD-Q6_K_XL.gguf`
  - Download from: [Hugging Face](https://huggingface.co/ggml-org/Qwen2.5-3B-Instruct-Q6_K_L.gguf)
  - Place in: `ComfyUI/models/clip/`

- **Unet Model**: `z_image_turbo-Q8_0.gguf`
  - Download from: [Hugging Face](https://huggingface.co/city96/FLUX.1-dev-gguf/blob/main/flux1-dev-Q8_0.gguf)
  - Place in: `ComfyUI/models/unet/`

#### Required Models for Video Generation (`workflows/video.json`):

- **Checkpoint Model**: `HV15-Rapid-AIO-v1.safetensors`
  - Download from: [Hugging Face](https://huggingface.co/Tencent-Hunyuan/HunyuanVideo/blob/main/HV15-Rapid-AIO-v1.safetensors)
  - Place in: `ComfyUI/models/checkpoints/`

- **CLIP Vision Model**: `sigclip_vision_patch14_384.safetensors`
  - Download from: [Hugging Face](https://huggingface.co/google/siglip-so400m-patch14-384/blob/main/sigclip_vision_patch14_384.safetensors)
  - Place in: `ComfyUI/models/clip_vision/`

#### ComfyUI Installation

1. **Install ComfyUI**:
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   pip install -r requirements.txt
   ```

2. **Download Required Custom Nodes** (for advanced features):
   - ComfyUI-GGUF: `https://github.com/city96/ComfyUI-GGUF`
   - rgthree-comfy: `https://github.com/rgthree/rgthree-comfy`

3. **Model Setup**:
   Download the models listed above and place them in the appropriate ComfyUI model directories.

**Note**: Model file sizes can be large (several GB). Ensure you have sufficient disk space and a stable internet connection for downloads.

## ⚡ Quick Start

### System Requirements

- Node.js version 18 or higher
- Python 3.11 or above
- Git for version control

### Automated Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/kliewerdaniel/concreat.git
   cd ConCreat
   ```

2. **Execute Setup Script**
   ```bash
   npm run setup
   ```
   This command handles all dependency installations and creates the Python virtual environment automatically.

3. **Launch Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Manual Setup

For those preferring step-by-step installation:

### Frontend Dependencies
```bash
npm install
```

### Python Environment Setup
```bash
python3 -m venv venv
source venv/bin/activate  # Use `venv\Scripts\activate` on Windows
```

### Python Dependencies
```bash
pip install -r requirements.txt
```

### Application Launch
```bash
npm run dev
```

## 📂 Project Architecture

```
ConCreat/
├── src/app/
│   ├── api/
│   │   ├── chat/          # Chat system endpoints
│   │   ├── generate/      # Content creation APIs
│   │   ├── images/        # Image manipulation APIs
│   │   ├── tts/           # Text-to-speech conversion
│   │   ├── videos/        # Video processing endpoints
│   │   └── voices/        # Voice management system
│   ├── globals.css        # Global stylesheet
│   ├── layout.tsx         # Application layout component
│   └── page.tsx           # Main page component
├── public/                # Static resources
├── workflows/             # Workflow configuration files
├── tts_service.py         # Python TTS service implementation
├── setup.sh               # Automated setup script
├── requirements.txt       # Python package requirements
├── package.json           # Node.js project configuration
└── README.md              # Project documentation
```

**Important Note:** The `chatterbox/` directory containing TTS models is generated during setup and not part of the repository.

## 🔌 API Reference

- `GET/POST /api/chat` - Interactive chat functionality
- `POST /api/generate` - AI content generation services
- `GET/POST /api/images` - Image processing and management
- `POST /api/tts` - Text-to-speech conversion endpoint
- `GET/POST /api/videos` - Video content operations
- `GET/POST /api/voices` - Voice cloning and management

## 🔐 Environment Configuration

Create a `.env.local` file in the project root with:

```bash
# Optional Hugging Face authentication token
HF_TOKEN=your_huggingface_token_here
```

## 🛠️ Development Workflow

### Available Commands

- `npm run dev` - Initiate development server
- `npm run build` - Create production build
- `npm run start` - Launch production server
- `npm run lint` - Execute code linting
- `npm run setup` - Complete environment setup

### Quality Assurance

The project maintains high code standards with:
- **ESLint** for JavaScript/TypeScript code quality
- **TypeScript** for enhanced type safety
- **Tailwind CSS** for consistent styling

## 🤝 Contributing Guidelines

We welcome contributions! Please follow these steps:

1. Fork the project repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -am 'Add amazing feature'`
4. Push your changes: `git push origin feature/amazing-feature`
5. Open a pull request for review

## 📄 License Information

This project is distributed under the MIT License.

## 🛠️ Technology Stack

- **Frontend Framework:** Next.js with React and TypeScript
- **Styling:** Tailwind CSS for responsive design
- **Backend Services:** Next.js API routes with Python integration
- **AI/ML Components:** ComfyUI workflows, Chatterbox TTS system, HunyuanVideo models with PyTorch
- **Deployment Platform:** Vercel (recommended)

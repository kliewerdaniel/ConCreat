"use client";

import { useState, useEffect, useRef } from "react";

const COMFYUI_URL = "http://localhost:8188";



interface UnifiedMedia {
  id: string;
  type: 'image' | 'video';
  filename: string;
  subfolder: string;
  prompt_id: string;
  localPath?: string;
  localFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  inputImage?: string;
  isFavorite?: boolean;
  createdAt?: Date;
}

interface GeneratedImage {
  filename: string;
  subfolder: string;
  prompt_id: string;
  localPath?: string;
  localFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  isFavorite?: boolean;
  createdAt?: Date;
}

interface GeneratedVideo {
  filename: string;
  subfolder: string;
  prompt_id: string;
  localPath?: string;
  localFilename?: string;
  prompt?: string;
  negativePrompt?: string;
  inputImage?: string;
  isFavorite?: boolean;
  createdAt?: Date;
}

interface FilesystemImage {
  filename: string;
  url: string;
}

interface FilesystemVideo {
  filename: string;
  url: string;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isPlaying?: boolean;
}

interface Voice {
  id: string;
  name: string;
  description: string;
  filePath: string;
  isDefault: boolean;
  createdAt: string;
  type: 'uploaded' | 'built-in';
}



interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: Date;
}



export default function Home() {
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [pastImages, setPastImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);

  // Video state
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [pastVideos, setPastVideos] = useState<GeneratedVideo[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [selectedInputImage, setSelectedInputImage] = useState<string>("");
  const [selectedInputImageFile, setSelectedInputImageFile] = useState<File | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoNegativePrompt, setVideoNegativePrompt] = useState("");

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemma");

  // New QoL features state
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [negativePromptCollapsed, setNegativePromptCollapsed] = useState(true);

  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(5000); // Default 5 seconds

  // Gallery state
  const [unifiedGallery, setUnifiedGallery] = useState<UnifiedMedia[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [gallerySortBy, setGallerySortBy] = useState<'newest' | 'oldest' | 'favorites'>('newest');
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());

  // Helper function to get filtered gallery
  const getFilteredGallery = () => {
    let filtered = unifiedGallery;
    if (galleryFilter === 'images') {
      filtered = unifiedGallery.filter((item: UnifiedMedia) => item.type === 'image');
    } else if (galleryFilter === 'videos') {
      filtered = unifiedGallery.filter((item: UnifiedMedia) => item.type === 'video');
    }
    return filtered;
  };

  // Generation section state
  const [generationCollapsed, setGenerationCollapsed] = useState(false); // Default expanded

  // Chat section state
  const [chatCollapsed, setChatCollapsed] = useState(false); // Default expanded

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioBlob, setTtsAudioBlob] = useState<Blob | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // Voice and TTS state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("default_female");
  const [voiceAndTtsCollapsed, setVoiceAndTtsCollapsed] = useState(true);
  const [voiceUploadCollapsed, setVoiceUploadCollapsed] = useState(true);
  const [voiceUploadName, setVoiceUploadName] = useState("");
  const [voiceUploadDescription, setVoiceUploadDescription] = useState("");
  const [voiceUploadFile, setVoiceUploadFile] = useState<File | null>(null);
  const [voiceUploadLoading, setVoiceUploadLoading] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);

  // Refs
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Load images from filesystem and JSON data
    const loadImagesAndData = async () => {
      try {
        // Load image data from JSON file
        const imageDataResponse = await fetch('/api/image-data');
        const imageData = await imageDataResponse.json();

        // Load images from filesystem
        const imagesResponse = await fetch('/api/images');
        const imagesData = await imagesResponse.json();

        if (imageData.success && imagesData.success) {
          // Create a map of filename to metadata for quick lookup
          const metadataMap = new Map();
          imageData.images.forEach((img: GeneratedImage) => {
            if (img.localFilename) {
              metadataMap.set(img.localFilename, img);
            } else if (img.filename) {
              metadataMap.set(img.filename, img);
            }
          });

          // Combine filesystem images with metadata
          const combinedImages: GeneratedImage[] = imagesData.images.map((img: FilesystemImage) => {
            const metadata = metadataMap.get(img.filename);
            return {
              filename: img.filename,
              subfolder: metadata?.subfolder || 'image_maker_app', // Default to the subfolder used by image generation
              prompt_id: metadata?.prompt_id || '',
              localPath: img.url,
              localFilename: img.filename,
              prompt: metadata?.prompt || '',
              negativePrompt: metadata?.negativePrompt || '',
              isFavorite: metadata?.isFavorite || false,
              createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : new Date()
            };
          });

          // Sort by creation date (newest first)
          combinedImages.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          setPastImages(combinedImages);
        }
      } catch (error) {
        console.error('Error loading images:', error);
        // Fallback to localStorage for backward compatibility
        const saved = localStorage.getItem("pastImages");
        if (saved) {
          setPastImages(JSON.parse(saved));
        }
      }
    };

    // Load available Ollama models
    const loadAvailableModels = async () => {
      try {
        const modelsResponse = await fetch('/api/models');
        const modelsData = await modelsResponse.json();

        if (modelsData.success && modelsData.models.length > 0) {
          setAvailableModels(modelsData.models);
          // If gemma is available, set it as default, otherwise use the first available model
          if (modelsData.models.includes('gemma')) {
            setSelectedModel('gemma');
          } else {
            setSelectedModel(modelsData.models[0]);
          }
        } else {
          // Fallback to default models
          setAvailableModels(['gemma', 'llama2', 'mistral', 'codellama']);
          setSelectedModel('gemma');
        }
      } catch (error) {
        console.error('Error loading models:', error);
        // Fallback to default models
        setAvailableModels(['gemma', 'llama2', 'mistral', 'codellama']);
        setSelectedModel('gemma');
      }
    };

    loadImagesAndData();
    loadAvailableModels();

    // Load video data
    const loadVideoData = async () => {
      try {
        const videoDataResponse = await fetch('/api/video-data');
        const videoData = await videoDataResponse.json();

        if (videoData.success) {
          // Create a map of filename to metadata for quick lookup
          const metadataMap = new Map();
          videoData.videos.forEach((vid: GeneratedVideo) => {
            if (vid.localFilename) {
              metadataMap.set(vid.localFilename, vid);
            } else if (vid.filename) {
              metadataMap.set(vid.filename, vid);
            }
          });

          // Load videos from filesystem
          const videosResponse = await fetch('/api/videos');
          const videosData = await videosResponse.json();

          if (videosData.success) {
            // Combine filesystem videos with metadata
            const combinedVideos: GeneratedVideo[] = videosData.videos.map((vid: FilesystemVideo) => {
              const metadata = metadataMap.get(vid.filename);
              return {
                filename: vid.filename,
                subfolder: '',
                prompt_id: metadata?.prompt_id || '',
                localPath: vid.url,
                localFilename: vid.filename,
                prompt: metadata?.prompt || '',
                negativePrompt: metadata?.negativePrompt || '',
                inputImage: metadata?.inputImage || '',
                isFavorite: metadata?.isFavorite || false,
                createdAt: metadata?.createdAt ? new Date(metadata.createdAt) : new Date()
              };
            });

            // Sort by creation date (newest first)
            combinedVideos.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });

            setPastVideos(combinedVideos);
          }
        }
      } catch (error) {
        console.error('Error loading videos:', error);
      }
    };

    // Load voices
    const loadVoices = async () => {
      try {
        const voicesResponse = await fetch('/api/voices');
        const voicesData = await voicesResponse.json();

        if (voicesData.success) {
          setVoices(voicesData.voices);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
      }
    };

    loadVideoData();
    loadVoices();
  }, []);

  // Combine images and videos into unified gallery
  useEffect(() => {
    const combined: UnifiedMedia[] = [
      ...pastImages.map(img => ({
        id: `img-${img.filename}-${img.prompt_id}`,
        type: 'image' as const,
        filename: img.filename,
        subfolder: img.subfolder,
        prompt_id: img.prompt_id,
        localPath: img.localPath,
        localFilename: img.localFilename,
        prompt: img.prompt,
        negativePrompt: img.negativePrompt,
        isFavorite: img.isFavorite,
        createdAt: img.createdAt
      })),
      ...pastVideos.map(vid => ({
        id: `vid-${vid.filename}-${vid.prompt_id}`,
        type: 'video' as const,
        filename: vid.filename,
        subfolder: vid.subfolder,
        prompt_id: vid.prompt_id,
        localPath: vid.localPath,
        localFilename: vid.localFilename,
        prompt: vid.prompt,
        negativePrompt: vid.negativePrompt,
        inputImage: vid.inputImage,
        isFavorite: vid.isFavorite,
        createdAt: vid.createdAt
      }))
    ];

    // Sort by creation date (newest first)
    combined.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    setUnifiedGallery(combined);
  }, [pastImages, pastVideos]);

  const generateImage = async () => {
    if (!positivePrompt.trim()) return;

    setLoading(true);
    try {
      // Load and modify the workflow
      const response = await fetch("/imagemaker.json");
      const workflow = await response.json();

      // Modify the prompts, seed, and filename prefix
      workflow["6"].inputs.text = positivePrompt;
      workflow["38"].inputs.text = negativePrompt;

      // Generate a truly random seed for each generation
      const randomSeed = Math.floor(Math.random() * 999999999999999);
      workflow["3"].inputs.seed = randomSeed;

      workflow["9"].inputs.filename_prefix = "image_maker_app/generated_";

      // Send to API route
      const promptResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        throw new Error("Failed to send prompt to ComfyUI");
      }

      const promptData = await promptResponse.json();

      if (promptData.error) {
        throw new Error(promptData.error);
      }

      const { prompt_id } = promptData;

      // Poll for results
      const pollInterval = setInterval(async () => {
        const historyResponse = await fetch(`/api/generate?prompt_id=${prompt_id}`);

        if (!historyResponse.ok) {
          clearInterval(pollInterval);
          setLoading(false);
          addToast("Failed to check generation status", "error");
          return;
        }

        const history = await historyResponse.json();

        if (history.error) {
          clearInterval(pollInterval);
          setLoading(false);
          addToast(`Generation error: ${history.error}`, "error");
          return;
        }

        const status = history[prompt_id]?.status?.status_str;

        if (status === "success") {
          clearInterval(pollInterval);
          const outputs = history[prompt_id].outputs;
          const saveImageNode = outputs["9"];
          if (saveImageNode?.images?.length > 0) {
            const image = saveImageNode.images[0];
            const filename = image.filename;
            const subfolder = image.subfolder;

            // Download and save image locally
            try {
              const downloadResponse = await fetch(`/api/generate?download=true&filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}`);

              if (downloadResponse.ok) {
                const downloadData = await downloadResponse.json();
                if (downloadData.success) {
                  const localImageUrl = downloadData.localPath;
                  setCurrentImage(localImageUrl);

                  const newImage: GeneratedImage = {
                    filename: downloadData.filename,
                    subfolder,
                    prompt_id,
                    localPath: localImageUrl,
                    localFilename: downloadData.filename,
                    prompt: positivePrompt,
                    negativePrompt: negativePrompt,
                    isFavorite: false,
                    createdAt: new Date()
                  };

                  // Save to JSON file
                  try {
                    await fetch('/api/image-data', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        filename: downloadData.filename,
                        localPath: localImageUrl,
                        localFilename: downloadData.filename,
                        prompt: positivePrompt,
                        negativePrompt: negativePrompt,
                        isFavorite: false,
                        createdAt: new Date().toISOString(),
                        prompt_id
                      }),
                    });
                  } catch (saveError) {
                    console.error('Error saving to JSON file:', saveError);
                  }

                  const updatedPast = [newImage, ...pastImages.slice(0, 9)]; // Keep last 10
                  setPastImages(updatedPast);
                } else {
                  throw new Error("Failed to download image locally");
                }
              } else {
                throw new Error("Failed to download image locally");
              }
            } catch (downloadError) {
              console.error("Download error:", downloadError);
              // Fallback to ComfyUI URL if local download fails
              const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
              setCurrentImage(imageUrl);

              const newImage: GeneratedImage = {
                filename,
                subfolder,
                prompt_id,
                prompt: positivePrompt,
                negativePrompt: negativePrompt,
                isFavorite: false,
                createdAt: new Date()
              };

              // Save to JSON file even for fallback
              try {
                await fetch('/api/image-data', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    filename,
                    localPath: imageUrl,
                    localFilename: filename,
                    prompt: positivePrompt,
                    negativePrompt: negativePrompt,
                    isFavorite: false,
                    createdAt: new Date().toISOString(),
                    prompt_id
                  }),
                });
              } catch (saveError) {
                console.error('Error saving to JSON file:', saveError);
              }

              const updatedPast = [newImage, ...pastImages.slice(0, 9)]; // Keep last 10
              setPastImages(updatedPast);
            }
          }
          setLoading(false);
        } else if (history[prompt_id]?.status?.status_str === "error") {
          clearInterval(pollInterval);
          setLoading(false);
          addToast("Image generation failed", "error");
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      setLoading(false);
      addToast("Error generating image", "error");
    }
  };

  const clearAllImages = async () => {
    if (!confirm("Are you sure you want to clear all images? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/images?clearAll=true", {
        method: "DELETE",
      });

      if (response.ok) {
        setPastImages([]);
        setCurrentImage(null);

        // Clear JSON data
        try {
          await fetch('/api/image-data', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([]),
          });
        } catch (jsonError) {
          console.error('Error clearing JSON data:', jsonError);
        }

        addToast("All images cleared successfully", "success");
      } else {
        addToast("Failed to clear images", "error");
      }
    } catch (error) {
      console.error("Clear images error:", error);
      addToast("Error clearing images", "error");
    }
  };

  const deleteImage = async (filename: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      const response = await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedPast = pastImages.filter(img => (img.localFilename || img.filename) !== filename);
        setPastImages(updatedPast);

        // Update JSON data
        try {
          const updatedImages = updatedPast.map(img => ({
            filename: img.localFilename || img.filename,
            localPath: img.localPath,
            localFilename: img.localFilename,
            prompt: img.prompt,
            negativePrompt: img.negativePrompt,
            isFavorite: img.isFavorite,
            createdAt: img.createdAt?.toISOString(),
            prompt_id: img.prompt_id
          }));

          await fetch('/api/image-data', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedImages),
          });
        } catch (jsonError) {
          console.error('Error updating JSON data:', jsonError);
        }

        // If the current image was deleted, clear it
        if (currentImage?.includes(filename)) {
          setCurrentImage(null);
        }
      } else {
        addToast("Failed to delete image", "error");
      }
    } catch (error) {
      console.error("Delete image error:", error);
      addToast("Error deleting image", "error");
    }
  };

  // Video functions
  const generateVideo = async () => {
    if (!selectedInputImage || !videoPrompt.trim()) return;

    setVideoLoading(true);
    try {
      let uploadedImageName = '';

      if (selectedInputImageFile) {
        // User uploaded a file directly - upload it via our API route
        const formData = new FormData();
        formData.append('image', selectedInputImageFile);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('Upload failed:', uploadResponse.status, errorData);
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        console.log('Upload response:', uploadData);
        uploadedImageName = uploadData.uploadedFilename;
      } else {
        // Image from gallery - copy from ComfyUI output to input directory
        const selectedImage = pastImages.find(img =>
          (img.localPath === selectedInputImage) ||
          (`${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=output` === selectedInputImage)
        );

        if (!selectedImage) {
          throw new Error('Selected image not found in gallery');
        }

        // Ensure we have the required filename and subfolder
        if (!selectedImage.filename || !selectedImage.subfolder) {
          throw new Error('Selected image is missing required metadata (filename/subfolder)');
        }

        // Copy the image from ComfyUI output to input directory
        // Use localFilename if available (this is the actual filename on disk)
        const filenameToUse = selectedImage.localFilename || selectedImage.filename;

        const copyResponse = await fetch('/api/copy-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filenameToUse,
            subfolder: selectedImage.subfolder,
          }),
        });

        if (!copyResponse.ok) {
          const errorText = await copyResponse.text();
          console.error('Copy failed:', copyResponse.status, errorText);
          throw new Error('Failed to copy image to ComfyUI input directory');
        }

        const copyData = await copyResponse.json();
        console.log('Copy response:', copyData);
        uploadedImageName = copyData.uploadedFilename; // Our API returns the filename
      }

      // Load and modify the video workflow
      const response = await fetch("/video.json");
      const workflow = await response.json();

      // Modify the prompts
      workflow["3"].inputs.text = videoPrompt;
      workflow["4"].inputs.text = videoNegativePrompt;

      // Update the image path to use the uploaded image
      workflow["13"].inputs.image = uploadedImageName;

      // Send to API route
      const promptResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        throw new Error("Failed to send prompt to ComfyUI");
      }

      const promptData = await promptResponse.json();

      if (promptData.error) {
        throw new Error(promptData.error);
      }

      const { prompt_id } = promptData;

      // Poll for results
      const pollInterval = setInterval(async () => {
        const historyResponse = await fetch(`/api/generate?prompt_id=${prompt_id}`);

        if (!historyResponse.ok) {
          clearInterval(pollInterval);
          setVideoLoading(false);
          addToast("Failed to check generation status", "error");
          return;
        }

        const history = await historyResponse.json();

        if (history.error) {
          clearInterval(pollInterval);
          setVideoLoading(false);
          addToast(`Generation error: ${history.error}`, "error");
          return;
        }

        const status = history[prompt_id]?.status?.status_str;

        if (status === "success") {
          clearInterval(pollInterval);
          const outputs = history[prompt_id].outputs;
          console.log('ComfyUI history outputs:', outputs);
          const saveVideoNode = outputs["9"];
          console.log('VHS VideoCombine node output:', saveVideoNode);
          // VHS_VideoCombine may not return video metadata in outputs, so try alternative approach
            // Try to download the video - VHS_VideoCombine saves with pattern "vid_XXXXX_.mp4"
            try {
              // Poll for video file - VHS can take significant time to encode and write the file
              const pollForVideo = async () => {
                // Try common filename patterns that VHS_VideoCombine generates
                // VHS node outputs gifs: Array(1), so try GIF files too
                const possibleFiles = [
                  // Standard MP4 patterns
                  { filename: 'vid_00001_.mp4', subfolder: 'HV15Out' },
                  { filename: 'vid_00002_.mp4', subfolder: 'HV15Out' },
                  { filename: 'vid_00003_.mp4', subfolder: 'HV15Out' },
                  { filename: 'vid_00004_.mp4', subfolder: 'HV15Out' },
                  { filename: 'vid_00005_.mp4', subfolder: 'HV15Out' },
                  // Try GIF files since VHS outputs gifs: Array(1)
                  { filename: 'vid_00001_.gif', subfolder: 'HV15Out' },
                  { filename: 'vid_00002_.gif', subfolder: 'HV15Out' },
                  { filename: 'vid_00003_.gif', subfolder: 'HV15Out' },
                  { filename: 'vid_00004_.gif', subfolder: 'HV15Out' },
                  { filename: 'vid_00005_.gif', subfolder: 'HV15Out' },
                  // Try without subfolder
                  { filename: 'vid_00001_.mp4', subfolder: '' },
                  { filename: 'vid_00002_.mp4', subfolder: '' },
                  { filename: 'vid_00001_.gif', subfolder: '' },
                  { filename: 'vid_00002_.gif', subfolder: '' },
                  // Try in output folder
                  { filename: 'vid_00001_.mp4', subfolder: 'output' },
                  { filename: 'vid_00002_.mp4', subfolder: 'output' },
                  { filename: 'vid_00001_.gif', subfolder: 'output' },
                  { filename: 'vid_00002_.gif', subfolder: 'output' },
                  // Try videos folder
                  { filename: 'vid_00001_.mp4', subfolder: 'videos' },
                  { filename: 'vid_00002_.mp4', subfolder: 'videos' },
                  { filename: 'vid_00001_.gif', subfolder: 'videos' },
                  { filename: 'vid_00002_.gif', subfolder: 'videos' },
                ];

                for (const fileInfo of possibleFiles) {
                  try {
                    const downloadResponse = await fetch(`/api/generate?download=true&type=video&filename=${encodeURIComponent(fileInfo.filename)}&subfolder=${encodeURIComponent(fileInfo.subfolder)}`);
                    if (downloadResponse.ok) {
                      const downloadData = await downloadResponse.json();
                      if (downloadData.success) {
                        console.log(`Video found at ${fileInfo.subfolder}/${fileInfo.filename}`);
                        return downloadData;
                      }
                    }
                  } catch (e) {
                    // Try next file
                    continue;
                  }
                }
                return null;
              };

              // Start with a longer initial delay since video encoding takes time
              console.log('Waiting 10 seconds for video encoding to complete...');
              await new Promise(resolve => setTimeout(resolve, 10000));

              // Try to download with increasing delays - video encoding takes time
              let downloadData = null;
              const maxAttempts = 8;
              const delays = [2000, 3000, 5000, 8000, 10000, 15000, 20000]; // Up to ~60 seconds total

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                console.log(`Video download attempt ${attempt + 1}/${maxAttempts}`);
                downloadData = await pollForVideo();

                if (downloadData) {
                  console.log('Video download successful!');
                  break;
                }

                if (attempt < maxAttempts - 1) {
                  console.log(`Waiting ${delays[attempt]}ms before next attempt...`);
                  await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                }
              }

              if (downloadData) {
                setCurrentVideo(downloadData.localPath);

                const newVideo: GeneratedVideo = {
                  filename: downloadData.filename,
                  subfolder: 'HV15Out',
                  prompt_id,
                  localPath: downloadData.localPath,
                  localFilename: downloadData.filename,
                  prompt: videoPrompt,
                  negativePrompt: videoNegativePrompt,
                  inputImage: selectedInputImage,
                  isFavorite: false,
                  createdAt: new Date()
                };

                // Save to JSON file
                try {
                  await fetch('/api/video-data', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      filename: downloadData.filename,
                      localPath: downloadData.localPath,
                      localFilename: downloadData.filename,
                      prompt: videoPrompt,
                      negativePrompt: videoNegativePrompt,
                      inputImage: selectedInputImage,
                      isFavorite: false,
                      createdAt: new Date().toISOString(),
                      prompt_id
                    }),
                  });
                } catch (saveError) {
                  console.error('Error saving video to JSON file:', saveError);
                }

                const updatedPast = [newVideo, ...pastVideos.slice(0, 9)]; // Keep last 10
                setPastVideos(updatedPast);
                addToast("Video generated and saved successfully!", "success");
              } else {
                // If all download attempts fail, create entry with ComfyUI URL as fallback
                const fallbackVideo: GeneratedVideo = {
                  filename: `vid_${Date.now()}.mp4`,
                  subfolder: 'HV15Out',
                  prompt_id,
                  prompt: videoPrompt,
                  negativePrompt: videoNegativePrompt,
                  inputImage: selectedInputImage,
                  isFavorite: false,
                  createdAt: new Date()
                };

                const updatedPast = [fallbackVideo, ...pastVideos.slice(0, 9)]; // Keep last 10
                setPastVideos(updatedPast);

                addToast("Video generated but could not be downloaded locally", "error");
              }
            } catch (downloadError) {
              console.error("Video download/save error:", downloadError);
              addToast("Failed to save video locally", "error");
            }
          setVideoLoading(false);
        } else if (history[prompt_id]?.status?.status_str === "error") {
          clearInterval(pollInterval);
          setVideoLoading(false);
          addToast("Video generation failed", "error");
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      setVideoLoading(false);
      addToast("Error generating video", "error");
    }
  };

  const downloadVideo = async (videoUrl: string, filename: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Video downloaded successfully!", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download video", "error");
    }
  };

  const deleteVideo = async (filename: string) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      const response = await fetch(`/api/videos?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedPast = pastVideos.filter(vid => (vid.localFilename || vid.filename) !== filename);
        setPastVideos(updatedPast);

        // If the current video was deleted, clear it
        if (currentVideo?.includes(filename)) {
          setCurrentVideo(null);
        }
      } else {
        addToast("Failed to delete video", "error");
      }
    } catch (error) {
      console.error("Delete video error:", error);
      addToast("Error deleting video", "error");
    }
  };

  const clearAllVideos = async () => {
    if (!confirm("Are you sure you want to clear all videos? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/videos?clearAll=true", {
        method: "DELETE",
      });

      if (response.ok) {
        setPastVideos([]);
        setCurrentVideo(null);
        addToast("All videos cleared successfully", "success");
      } else {
        addToast("Failed to clear videos", "error");
      }
    } catch (error) {
      console.error("Clear videos error:", error);
      addToast("Error clearing videos", "error");
    }
  };

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatMessage.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatMessage,
      isUser: true,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatMessage("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error("Failed to get chat response");
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // QoL Utility Functions
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast: Toast = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  };



  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Image downloaded successfully!", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download image", "error");
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    addToast("Prompt copied to clipboard!", "success");
  };



  const clearChat = () => {
    if (confirm("Are you sure you want to clear all chat messages?")) {
      setChatMessages([]);
      addToast("Chat cleared", "info");
    }
  };

  // TTS functions
  const playTTS = async (message: ChatMessage) => {
    if (message.isPlaying) return;

    try {
      // Update message to show playing state
      setChatMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, isPlaying: true } : m
      ));

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message.text, voice: selectedVoice }),
      });

      if (!response.ok) {
        throw new Error("TTS generation failed");
      }

      const data = await response.json();

      // Convert base64 to blob and play
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        // Reset playing state
        setChatMessages(prev => prev.map(m =>
          m.id === message.id ? { ...m, isPlaying: false } : m
        ));
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setChatMessages(prev => prev.map(m =>
          m.id === message.id ? { ...m, isPlaying: false } : m
        ));
        URL.revokeObjectURL(audioUrl);
        addToast("Failed to play audio", "error");
      };

      await audio.play();

    } catch (error) {
      console.error("TTS error:", error);
      setChatMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, isPlaying: false } : m
      ));
      addToast("TTS failed to generate audio", "error");
    }
  };

  const playTTSInput = async () => {
    if (!ttsText.trim() || ttsLoading) return;

    setTtsLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: ttsText, voice: selectedVoice }),
      });

      if (!response.ok) {
        throw new Error("TTS generation failed");
      }

      const data = await response.json();

      // Convert base64 to blob and play
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      // Store the blob and URL for download
      setTtsAudioBlob(blob);
      setTtsAudioUrl(audioUrl);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        // Don't revoke the URL since we need it for download
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setTtsAudioBlob(null);
        setTtsAudioUrl(null);
        addToast("Failed to play audio", "error");
      };

      await audio.play();

    } catch (error) {
      console.error("TTS input error:", error);
      addToast("TTS failed to generate audio", "error");
    } finally {
      setTtsLoading(false);
    }
  };

  // Voice management functions
  const uploadVoice = async () => {
    if (!voiceUploadFile || !voiceUploadName.trim()) return;

    setVoiceUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', voiceUploadFile);
      formData.append('name', voiceUploadName.trim());
      formData.append('description', voiceUploadDescription.trim());

      const response = await fetch('/api/voices/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      // Reload voices
      const voicesResponse = await fetch('/api/voices');
      const voicesData = await voicesResponse.json();
      if (voicesData.success) {
        setVoices(voicesData.voices);
      }

      // Reset form
      setVoiceUploadName('');
      setVoiceUploadDescription('');
      setVoiceUploadFile(null);

      addToast('Voice uploaded successfully!', 'success');
    } catch (error) {
      console.error('Voice upload error:', error);
      addToast('Failed to upload voice', 'error');
    } finally {
      setVoiceUploadLoading(false);
    }
  };

  const updateVoice = async (voiceId: string, name: string, description: string) => {
    try {
      const response = await fetch('/api/voices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: voiceId, name, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      // Reload voices
      const voicesResponse = await fetch('/api/voices');
      const voicesData = await voicesResponse.json();
      if (voicesData.success) {
        setVoices(voicesData.voices);
      }

      setEditingVoice(null);
      addToast('Voice updated successfully!', 'success');
    } catch (error) {
      console.error('Voice update error:', error);
      addToast('Failed to update voice', 'error');
    }
  };

  const deleteVoice = async (voiceId: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;

    try {
      const response = await fetch(`/api/voices?id=${voiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      // Reload voices
      const voicesResponse = await fetch('/api/voices');
      const voicesData = await voicesResponse.json();
      if (voicesData.success) {
        setVoices(voicesData.voices);
      }

      // If deleted voice was selected, switch to default
      if (selectedVoice === voiceId) {
        setSelectedVoice('default_female');
      }

      addToast('Voice deleted successfully!', 'success');
    } catch (error) {
      console.error('Voice delete error:', error);
      addToast('Failed to delete voice', 'error');
    }
  };

  const previewVoice = async (voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    if (!voice) return;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `Hello, this is a preview of the ${voice.name} voice.`,
          voice: voiceId
        }),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const data = await response.json();

      // Convert base64 to blob and play
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        addToast('Failed to play voice preview', 'error');
      };

      await audio.play();
    } catch (error) {
      console.error('Voice preview error:', error);
      addToast('Failed to preview voice', 'error');
    }
  };

  const downloadTTS = () => {
    if (!ttsAudioBlob || !ttsAudioUrl) return;

    try {
      const a = document.createElement('a');
      a.href = ttsAudioUrl;
      a.download = `tts_audio_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast("TTS audio downloaded successfully!", "success");
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download audio", "error");
    }
  };

  const handleTTSKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      playTTSInput();
    }
  };

  // Video play/pause functions
  const toggleVideoPlay = (videoId: string) => {
    const videoElement = videoRefs.current.get(videoId);
    if (!videoElement) return;

    if (playingVideos.has(videoId)) {
      // Pause this video
      videoElement.pause();
      setPlayingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    } else {
      // Pause any currently playing videos first
      playingVideos.forEach(id => {
        const playingVideo = videoRefs.current.get(id);
        if (playingVideo) {
          playingVideo.pause();
        }
      });
      setPlayingVideos(new Set([videoId]));

      // Play this video
      videoElement.currentTime = 0; // Reset to beginning
      videoElement.play().catch(error => {
        console.error('Error playing video:', error);
        setPlayingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
      });
    }
  };

  // Handle video end
  const handleVideoEnd = (videoId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  // Carousel functions
  const openCarousel = (index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
  };

  const closeCarousel = () => {
    setCarouselOpen(false);
  };

  const nextImage = () => {
    setCarouselIndex((prev) => (prev + 1) % pastImages.length);
    // Stop auto-play when manually navigating
    setAutoPlay(false);
  };

  const prevImage = () => {
    setCarouselIndex((prev) => (prev - 1 + pastImages.length) % pastImages.length);
    // Stop auto-play when manually navigating
    setAutoPlay(false);
  };

  const toggleAutoPlay = () => {
    setAutoPlay((prev) => !prev);
  };



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Carousel navigation when carousel is open
      if (carouselOpen) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            prevImage();
            break;
          case 'ArrowRight':
            e.preventDefault();
            nextImage();
            break;
          case 'Escape':
            e.preventDefault();
            closeCarousel();
            break;
        }
        return;
      }

      // Regular shortcuts when carousel is closed
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            if (!loading && positivePrompt.trim()) {
              e.preventDefault();
              generateImage();
            } else if (!chatLoading && chatMessage.trim()) {
              e.preventDefault();
              sendChatMessage();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [loading, positivePrompt, chatLoading, chatMessage, carouselOpen, carouselIndex, pastImages.length]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-play carousel
  useEffect(() => {
    if (autoPlay && carouselOpen && pastImages.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % pastImages.length);
      }, slideshowInterval);
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlay, carouselOpen, pastImages.length, slideshowInterval]);

  // Stop auto-play when carousel closes
  useEffect(() => {
    if (!carouselOpen) {
      setAutoPlay(false);
    }
  }, [carouselOpen]);

  // Navigation state
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery' | 'video' | 'chat' | 'voice'>('gallery');

  return (
    <div className="min-h-screen trippy-bg text-gray-100 relative">
      {/* Geometric animation layers */}
      <div className="geometric-layer">
        <div className="geometric-shape" style={{top: '10%', left: '10%', width: '100px', height: '100px'}}></div>
        <div className="geometric-shape" style={{top: '20%', right: '15%', width: '80px', height: '80px'}}></div>
        <div className="geometric-shape" style={{bottom: '30%', left: '20%', width: '120px', height: '120px'}}></div>
        <div className="geometric-shape" style={{bottom: '20%', right: '10%', width: '90px', height: '90px'}}></div>
        <div className="geometric-shape" style={{top: '50%', left: '50%', width: '70px', height: '70px'}}></div>
      </div>
      <div className="geometric-layer">
        <div className="geometric-shape" style={{top: '30%', left: '30%', width: '110px', height: '110px'}}></div>
        <div className="geometric-shape" style={{top: '60%', right: '25%', width: '85px', height: '85px'}}></div>
        <div className="geometric-shape" style={{bottom: '40%', left: '40%', width: '95px', height: '95px'}}></div>
        <div className="geometric-shape" style={{bottom: '10%', right: '30%', width: '75px', height: '75px'}}></div>
      </div>
      <div className="geometric-layer">
        <div className="geometric-shape" style={{top: '15%', right: '40%', width: '105px', height: '105px'}}></div>
        <div className="geometric-shape" style={{top: '70%', left: '15%', width: '88px', height: '88px'}}></div>
        <div className="geometric-shape" style={{bottom: '50%', right: '45%', width: '102px', height: '102px'}}></div>
        <div className="geometric-shape" style={{top: '40%', left: '60%', width: '78px', height: '78px'}}></div>
      </div>

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header with Navigation */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'gallery'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Gallery ({unifiedGallery.length})
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'chat'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'generate'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Photo
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'video'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Video ({pastVideos.length})
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === 'voice'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Voice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <div className="p-8 space-y-8">
              {/* Prompt Input Section */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-300">
                      Positive Prompt
                    </label>
                    <textarea
                      value={positivePrompt}
                      onChange={(e) => setPositivePrompt(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                      rows={4}
                      placeholder="Describe what you want to see in your image..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-300">
                        Negative Prompt
                      </label>
                      <button
                        onClick={() => setNegativePromptCollapsed(!negativePromptCollapsed)}
                        className="w-6 h-6 bg-transparent border border-white/20 hover:border-white/40 transition-all duration-200 rounded-sm"
                        title={negativePromptCollapsed ? "Expand negative prompt" : "Collapse negative prompt"}
                      >
                      </button>
                    </div>
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      negativePromptCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                    }`}>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                        rows={2}
                        placeholder="Describe what you don't want to see..."
                      />
                    </div>
                  </div>

                  <button
                    onClick={generateImage}
                    disabled={loading || !positivePrompt.trim()}
                    className="w-full py-4 px-6 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 disabled:bg-transparent disabled:border-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        <span>Generating Image...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        ✨ Generate Image (Ctrl+Enter)
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Image Display */}
              {currentImage && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={() => setCurrentImage(null)}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm mr-3"
                      title="Close image display"
                    >
                      ✕ Close
                    </button>
                    <button
                      onClick={() => downloadImage(currentImage, `generated_${Date.now()}.png`)}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                    >
                      📥 Download
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={currentImage}
                      alt="Generated"
                      className="max-w-full max-h-[70vh] w-auto h-auto rounded-xl shadow-2xl border border-white/10"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="p-8">
              {/* Gallery Header with Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-white">Media Gallery</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGalleryFilter('all')}
                      className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                        galleryFilter === 'all'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      All ({unifiedGallery.length})
                    </button>
                    <button
                      onClick={() => setGalleryFilter('images')}
                      className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                        galleryFilter === 'images'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      Images ({pastImages.length})
                    </button>
                    <button
                      onClick={() => setGalleryFilter('videos')}
                      className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                        galleryFilter === 'videos'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      Videos ({pastVideos.length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={gallerySortBy}
                    onChange={(e) => setGallerySortBy(e.target.value as 'newest' | 'oldest' | 'favorites')}
                    className="px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="newest" className="bg-slate-800">Newest First</option>
                    <option value="oldest" className="bg-slate-800">Oldest First</option>
                    <option value="favorites" className="bg-slate-800">Favorites</option>
                  </select>

                  <button
                    onClick={() => {
                      const imageItems = getFilteredGallery().filter((item: UnifiedMedia) => item.type === 'image');
                      if (imageItems.length > 0) {
                        setCarouselIndex(0);
                        setCarouselOpen(true);
                        setAutoPlay(true);
                      }
                    }}
                    disabled={getFilteredGallery().filter((item: UnifiedMedia) => item.type === 'image').length === 0}
                    className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Play Slideshow"
                  >
                    ▶️ Slideshow
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to clear all media? This action cannot be undone.")) {
                        // Clear images
                        await clearAllImages();
                        // Clear videos
                        await clearAllVideos();
                        addToast("All media cleared successfully", "success");
                      }
                    }}
                    disabled={unifiedGallery.length === 0}
                    className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🗑️ Clear All
                  </button>
                </div>
              </div>

              {/* Filtered and Sorted Gallery */}
              {(() => {
                // Filter gallery based on selected filter
                const getFilteredGallery = () => {
                  let filtered = unifiedGallery;
                  if (galleryFilter === 'images') {
                    filtered = unifiedGallery.filter((item: UnifiedMedia) => item.type === 'image');
                  } else if (galleryFilter === 'videos') {
                    filtered = unifiedGallery.filter((item: UnifiedMedia) => item.type === 'video');
                  }
                  return filtered;
                };

                const filteredGallery = getFilteredGallery();

                // Sort gallery based on selected sort option
                const sorted = [...filteredGallery].sort((a: UnifiedMedia, b: UnifiedMedia) => {
                  if (gallerySortBy === 'oldest') {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateA - dateB;
                  } else if (gallerySortBy === 'favorites') {
                    // Favorites first, then by date
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                  } else {
                    // newest (default)
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                  }
                });

                return sorted.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {sorted.map((item: UnifiedMedia, index: number) => (
                      <div key={item.id} className="relative group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-blue-400/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] backdrop-blur-sm">
                        {/* Media Type Indicator */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'image'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                              : 'bg-green-500/20 text-green-300 border border-green-400/30'
                          }`}>
                            {item.type === 'image' ? '🖼️ IMG' : '🎬 VID'}
                          </span>
                        </div>

                        {/* Favorite Indicator */}
                        {item.isFavorite && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="text-yellow-400 text-lg">⭐</span>
                          </div>
                        )}

                        <div className={`flex items-center justify-center p-3 ${
                          item.type === 'video' ? 'aspect-video' : 'aspect-square'
                        }`}>
                          {item.type === 'image' ? (
                            <img
                              src={item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`}
                              alt={`Generated ${item.type}`}
                              className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer rounded-lg transition-all duration-300 group-hover:scale-105"
                              onClick={() => {
                                if (item.type === 'image') {
                                  // Open image carousel with filtered images
                                  const imageItems = filteredGallery.filter((i: UnifiedMedia) => i.type === 'image');
                                  const imageIndex = imageItems.findIndex((i: UnifiedMedia) => i.id === item.id);
                                  if (imageIndex !== -1) {
                                    setCarouselIndex(imageIndex);
                                    setCarouselOpen(true);
                                  }
                                } else {
                                  // For videos, set as current video
                                  setCurrentVideo(item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`);
                                }
                              }}
                            />
                          ) : (
                            <video
                              ref={(el) => {
                                if (el) {
                                  videoRefs.current.set(item.id, el);
                                } else {
                                  videoRefs.current.delete(item.id);
                                }
                              }}
                              src={item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`}
                              className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer rounded-lg"
                              onClick={() => setCurrentVideo(item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`)}
                              muted
                              onMouseEnter={(e) => {
                                if (!playingVideos.has(item.id)) {
                                  e.currentTarget.play();
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!playingVideos.has(item.id)) {
                                  e.currentTarget.pause();
                                }
                              }}
                              onEnded={() => handleVideoEnd(item.id)}
                              playsInline
                            />
                          )}
                        </div>

                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 pointer-events-none backdrop-blur-sm">
                          {item.type === 'image' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`,
                                    item.localFilename || item.filename
                                  );
                                }}
                                className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                                title="Download"
                              >
                                📥
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPrompt(item.prompt || '');
                                }}
                                className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                                title="Copy prompt"
                              >
                                📋
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteImage(item.localFilename || item.filename);
                                }}
                                className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVideoPlay(item.id);
                                }}
                                className={`pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white ${
                                  playingVideos.has(item.id) ? 'bg-red-500/20 border-red-400/30' : ''
                                }`}
                                title={playingVideos.has(item.id) ? "Pause" : "Play"}
                              >
                                {playingVideos.has(item.id) ? '⏸️' : '▶️'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadVideo(
                                    item.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${encodeURIComponent(item.subfolder)}&type=output`,
                                    item.localFilename || item.filename
                                  );
                                }}
                                className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                                title="Download"
                              >
                                📥
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteVideo(item.localFilename || item.filename);
                                }}
                                className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">
                      {galleryFilter === 'images' ? '🖼️' : galleryFilter === 'videos' ? '🎬' : '📁'}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {galleryFilter === 'images'
                        ? 'No Images Yet'
                        : galleryFilter === 'videos'
                        ? 'No Videos Yet'
                        : 'No Media Yet'
                      }
                    </h3>
                    <p className="text-slate-400">
                      {galleryFilter === 'images'
                        ? 'Generate your first image to see it here!'
                        : galleryFilter === 'videos'
                        ? 'Generate your first video to see it here!'
                        : 'Generate images and videos to see them here!'
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="p-8 space-y-8">
              {/* Video Generation Section */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                <div className="space-y-6">
                  {/* Input Image Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-300">
                      Input Image
                    </label>
                    <div className="space-y-3">
                      {/* File Upload Option */}
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedInputImageFile(file);
                              setSelectedInputImage(URL.createObjectURL(file));
                            } else {
                              setSelectedInputImageFile(null);
                              setSelectedInputImage("");
                            }
                          }}
                          className="flex-1 p-3 bg-white/5 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 backdrop-blur-sm transition-all duration-200"
                        />
                        <span className="text-sm text-slate-400">or</span>
                        <select
                          value={selectedInputImageFile ? "" : selectedInputImage}
                          onChange={(e) => {
                            setSelectedInputImage(e.target.value);
                            setSelectedInputImageFile(null);
                          }}
                          className="flex-1 p-3 bg-white/5 border border-white/20 rounded-xl text-white focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 backdrop-blur-sm transition-all duration-200"
                        >
                          <option value="">Select from gallery...</option>
                          {pastImages.map((img, index) => (
                            <option key={index} value={img.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=output`}>
                              {img.prompt ? img.prompt.substring(0, 50) + '...' : `Image ${index + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedInputImage && (
                        <div className="flex justify-center">
                          <img
                            src={selectedInputImage}
                            alt="Selected input"
                            className="max-w-48 max-h-48 w-auto h-auto rounded-xl border border-white/20 shadow-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Video Prompts */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-300">
                      Video Prompt
                    </label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                      rows={3}
                      placeholder="Describe the motion and animation you want in the video..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-300">
                      Negative Prompt
                    </label>
                    <textarea
                      value={videoNegativePrompt}
                      onChange={(e) => setVideoNegativePrompt(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                      rows={2}
                      placeholder="Describe what you don't want in the video..."
                    />
                  </div>

                  <button
                    onClick={generateVideo}
                    disabled={videoLoading || !selectedInputImage || !videoPrompt.trim()}
                    className="w-full py-4 px-6 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 disabled:bg-transparent disabled:border-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    {videoLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        <span>Generating Video...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        🎬 Generate Video
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Video Display */}
              {currentVideo && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={() => setCurrentVideo(null)}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm mr-3"
                      title="Close video display"
                    >
                      ✕ Close
                    </button>
                    <button
                      onClick={() => downloadVideo(currentVideo!, `generated_video_${Date.now()}.mp4`)}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                    >
                      📥 Download
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <video
                      src={currentVideo}
                      controls
                      className="max-w-full max-h-[70vh] w-auto h-auto rounded-xl shadow-2xl border border-white/10"
                    />
                  </div>
                </div>
              )}

              {/* Video Gallery */}
              {pastVideos.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Generated Videos</h3>
                    <button
                      onClick={clearAllVideos}
                      className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                    >
                      🗑️ Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {pastVideos.map((video, index) => {
                      const videoId = `vid-${video.filename}-${video.prompt_id}`;
                      return (
                        <div key={index} className="relative group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-blue-400/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-[1.02] backdrop-blur-sm">
                          <div className="aspect-video flex items-center justify-center p-3">
                            <video
                              ref={(el) => {
                                if (el) {
                                  videoRefs.current.set(videoId, el);
                                } else {
                                  videoRefs.current.delete(videoId);
                                }
                              }}
                              src={video.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(video.filename)}&subfolder=${encodeURIComponent(video.subfolder)}&type=output`}
                              className="max-w-full max-h-full w-auto h-auto object-contain cursor-pointer rounded-lg"
                              onClick={() => setCurrentVideo(video.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(video.filename)}&subfolder=${encodeURIComponent(video.subfolder)}&type=output`)}
                              muted
                              onMouseEnter={(e) => {
                                if (!playingVideos.has(videoId)) {
                                  e.currentTarget.play();
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!playingVideos.has(videoId)) {
                                  e.currentTarget.pause();
                                }
                              }}
                              onEnded={() => handleVideoEnd(videoId)}
                              playsInline
                            />
                          </div>

                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 pointer-events-none backdrop-blur-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVideoPlay(videoId);
                              }}
                              className={`pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white ${
                                playingVideos.has(videoId) ? 'bg-red-500/20 border-red-400/30' : ''
                              }`}
                              title={playingVideos.has(videoId) ? "Pause" : "Play"}
                            >
                              {playingVideos.has(videoId) ? '⏸️' : '▶️'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadVideo(
                                  video.localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(video.filename)}&subfolder=${encodeURIComponent(video.subfolder)}&type=output`,
                                  video.localFilename || video.filename
                                );
                              }}
                              className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                              title="Download"
                            >
                              📥
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteVideo(video.localFilename || video.filename);
                              }}
                              className="pointer-events-auto p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-sm text-white"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[80vh]">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300">Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 backdrop-blur-sm transition-all duration-200"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model} className="bg-slate-800">
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={clearChat}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                >
                  🗑️ Clear Chat
                </button>
              </div>

              {/* Chat Messages */}
              <div
                ref={chatMessagesRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
              >
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-5 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                        message.isUser
                          ? 'bg-gradient-to-r from-gray-600/80 to-gray-500/80 text-white border border-gray-500/30'
                          : 'bg-white/10 text-slate-100 border border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                          <p className={`text-xs mt-3 opacity-70 ${
                            message.isUser ? 'text-gray-200' : 'text-slate-400'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {!message.isUser && (
                          <button
                            onClick={() => playTTS(message)}
                            disabled={message.isPlaying}
                            className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 backdrop-blur-sm border ${
                              message.isPlaying
                                ? 'bg-red-500/20 border-red-400/30 text-red-300 animate-pulse'
                                : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-slate-300 hover:text-white'
                            }`}
                            title={message.isPlaying ? "Playing..." : "Play TTS"}
                          >
                            {message.isPlaying ? (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
                                <span className="text-xs">🔊</span>
                              </div>
                            ) : (
                              <span className="text-sm">🔊</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 border border-white/20 p-5 rounded-2xl shadow-lg backdrop-blur-sm">
                      <div className="flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400/50 border-t-gray-400"></div>
                        <span className="text-slate-300 font-medium">{selectedModel} is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/10">
                <div className="flex space-x-4">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    className="flex-1 p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                    rows={2}
                    placeholder="Type your message... (Shift+Enter for new line, Ctrl+Enter to send)"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatMessage.trim() || chatLoading}
                    className="px-6 py-4 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 disabled:bg-transparent disabled:border-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    {chatLoading ? '⏳' : '🚀 '}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Tab */}
          {activeTab === 'voice' && (
            <div className="p-8 space-y-8">
              {/* Voice Management */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Voice Management</h2>
                  <button
                    onClick={() => setVoiceUploadCollapsed(!voiceUploadCollapsed)}
                    className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                    title="Upload new voice"
                  >
                    ➕ Upload Voice
                  </button>
                </div>

                {voices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {voices.map((voice) => (
                      <div key={voice.id} className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{voice.name}</h3>
                            {voice.description && (
                              <p className="text-sm text-slate-400 mt-1">{voice.description}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              {voice.type === 'built-in' ? 'Built-in' : 'Uploaded'} • {new Date(voice.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {voice.isDefault && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => previewVoice(voice.id)}
                            className="flex-1 px-3 py-2 bg-transparent hover:bg-white/10 border border-white/20 rounded-lg text-sm transition-all duration-200"
                          >
                            🔊 Preview
                          </button>
                          {!voice.isDefault && (
                            <>
                              <button
                                onClick={() => setEditingVoice(voice)}
                                className="px-3 py-2 bg-transparent hover:bg-white/10 border border-white/20 rounded-lg text-sm transition-all duration-200"
                                title="Edit voice"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteVoice(voice.id)}
                                className="px-3 py-2 bg-transparent hover:bg-red-500/20 border border-red-400/30 rounded-lg text-sm transition-all duration-200 text-red-300"
                                title="Delete voice"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No voices available</p>
                  </div>
                )}
              </div>

              {/* TTS Input */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Text-to-Speech</h3>
                    {/* Voice Selection */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-300">Voice:</label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="px-3 py-1 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 backdrop-blur-sm transition-all duration-200"
                      >
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id} className="bg-slate-800">
                            {voice.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3 text-slate-300">
                      Enter text to convert to speech
                    </label>
                    <textarea
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      onKeyPress={handleTTSKeyPress}
                      className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                      rows={4}
                      placeholder="Type any text here to hear it spoken..."
                      disabled={ttsLoading}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={playTTSInput}
                      disabled={!ttsText.trim() || ttsLoading}
                      className="flex-1 py-4 px-6 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 disabled:bg-transparent disabled:border-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
                    >
                      {ttsLoading ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                          <span>Generating Speech...</span>
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          🔊 Play Text-to-Speech (Enter)
                        </span>
                      )}
                    </button>

                    {ttsAudioBlob && ttsAudioUrl && (
                      <button
                        onClick={downloadTTS}
                        className="px-6 py-4 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                        title="Download TTS Audio"
                      >
                        📥 Download
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Upload Section */}
              {voiceUploadCollapsed && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                  <h3 className="text-lg font-semibold text-white mb-6">Upload New Voice</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Voice Name *
                      </label>
                      <input
                        type="text"
                        value={voiceUploadName}
                        onChange={(e) => setVoiceUploadName(e.target.value)}
                        className="w-full p-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 backdrop-blur-sm transition-all duration-200"
                        placeholder="Enter a name for this voice..."
                        disabled={voiceUploadLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Description (optional)
                      </label>
                      <textarea
                        value={voiceUploadDescription}
                        onChange={(e) => setVoiceUploadDescription(e.target.value)}
                        className="w-full p-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:border-gray-400/50 focus:ring-2 focus:ring-gray-400/20 resize-none backdrop-blur-sm transition-all duration-200"
                        rows={2}
                        placeholder="Describe this voice..."
                        disabled={voiceUploadLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Audio File *
                      </label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setVoiceUploadFile(e.target.files?.[0] || null)}
                        className="w-full p-3 bg-white/5 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 backdrop-blur-sm transition-all duration-200"
                        disabled={voiceUploadLoading}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Supported formats: WAV, MP3, OGG, FLAC (max 50MB)
                      </p>
                    </div>
                    <button
                      onClick={uploadVoice}
                      disabled={!voiceUploadFile || !voiceUploadName.trim() || voiceUploadLoading}
                      className="w-full py-3 px-6 bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 disabled:bg-transparent disabled:border-white/10 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
                    >
                      {voiceUploadLoading ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                          <span>Uploading Voice...</span>
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          ⬆️ Upload Voice
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>



        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white transition-all duration-200 p-2 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3 text-slate-300">⌨️ Keyboard Shortcuts</label>
                  <div className="text-sm text-slate-400 space-y-2 bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span>Generate/Send</span>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Ctrl+Enter</kbd>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <button
                    onClick={() => {
                      localStorage.clear();
                      setPastImages([]);
                      setChatMessages([]);
                      setCurrentImage(null);
                      addToast("All data cleared", "info");
                    }}
                    className="w-full py-3 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm"
                  >
                    🗑️ Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Carousel Modal */}
        {carouselOpen && pastImages.length > 0 && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50" onClick={closeCarousel}>
            <div className="relative max-w-6xl max-h-[95vh] w-full mx-6">
              {/* Close button */}
              <button
                onClick={closeCarousel}
                className="absolute top-6 right-6 z-20 text-white hover:text-slate-300 transition-all duration-200 text-3xl p-2 rounded-full hover:bg-white/10 backdrop-blur-sm"
              >
                ✕
              </button>

              {/* Navigation buttons */}
              {pastImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-6 top-1/2 transform -translate-y-1/2 text-white hover:text-slate-300 transition-all duration-200 text-4xl z-20 p-3 rounded-full hover:bg-white/10 backdrop-blur-sm"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white hover:text-slate-300 transition-all duration-200 text-4xl z-20 p-3 rounded-full hover:bg-white/10 backdrop-blur-sm"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Main image */}
              <div className="flex justify-center items-center py-16">
                <img
                  src={pastImages[carouselIndex].localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(pastImages[carouselIndex].filename)}&subfolder=${encodeURIComponent(pastImages[carouselIndex].subfolder)}&type=output`}
                  alt={`Image ${carouselIndex + 1}`}
                  className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Image info and controls */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-6 mb-6">
                  <span className="text-lg text-slate-300 font-medium px-4 py-2 bg-white/5 rounded-full backdrop-blur-sm border border-white/10">
                    {carouselIndex + 1} of {pastImages.length}
                  </span>
                </div>

                {/* Slideshow Controls */}
                {pastImages.length > 1 && (
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAutoPlay();
                      }}
                      className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm border bg-transparent hover:bg-white/5 border-white/20 text-white"
                    >
                      {autoPlay ? '⏸️ Pause Slideshow' : '▶️ Start Slideshow'}
                    </button>

                    {/* Slideshow Speed Slider */}
                    <div className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-4 backdrop-blur-sm border border-white/10">
                      <span className="text-sm text-slate-300 font-medium">Speed:</span>
                      <input
                        type="range"
                        min="1000"
                        max="30000"
                        step="1000"
                        value={slideshowInterval}
                        onChange={(e) => setSlideshowInterval(Number(e.target.value))}
                        className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-white min-w-[50px] font-mono">
                        {(slideshowInterval / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(
                        pastImages[carouselIndex].localPath || `${COMFYUI_URL}/view?filename=${encodeURIComponent(pastImages[carouselIndex].filename)}&subfolder=${encodeURIComponent(pastImages[carouselIndex].subfolder)}&type=output`,
                        pastImages[carouselIndex].localFilename || pastImages[carouselIndex].filename
                      );
                    }}
                    className="px-6 py-3 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPrompt(pastImages[carouselIndex].prompt || '');
                    }}
                    className="px-6 py-3 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                  >
                    📋 Copy Prompt
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(pastImages[carouselIndex].localFilename || pastImages[carouselIndex].filename);
                      if (pastImages.length > 1) {
                        if (carouselIndex === pastImages.length - 1) {
                          setCarouselIndex(carouselIndex - 1);
                        }
                      } else {
                        closeCarousel();
                      }
                    }}
                    className="px-6 py-3 bg-transparent hover:bg-white/5 border border-white/20 rounded-xl text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>

                {/* Prompt display */}
                {pastImages[carouselIndex].prompt && (
                  <div className="mt-8 text-left bg-white/5 rounded-2xl p-6 max-w-3xl mx-auto backdrop-blur-sm border border-white/10 shadow-lg">
                    <p className="text-slate-200 leading-relaxed">{pastImages[carouselIndex].prompt}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg backdrop-blur-sm border transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-700 text-green-100'
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-700 text-red-100'
                : 'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

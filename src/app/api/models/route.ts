import { NextRequest, NextResponse } from 'next/server';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export async function GET(request: NextRequest) {
  try {
    // Get list of available models from Ollama
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: OllamaTagsResponse = await response.json();

    // Extract model names from the response
    const models = data.models ? data.models.map((model: OllamaModel) => model.name) : [];

    return NextResponse.json({
      models: models,
      success: true
    });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);

    // Return fallback models if Ollama is not available
    return NextResponse.json({
      models: ['gemma', 'llama2', 'mistral', 'codellama'],
      success: false,
      error: 'Could not connect to Ollama. Using fallback model list.'
    });
  }
}

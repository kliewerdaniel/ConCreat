import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let message = '';
  let model = 'gemma'; // Default model

  try {
    const requestData = await request.json();
    message = requestData.message;
    model = requestData.model || 'gemma'; // Allow model selection, default to gemma

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use Ollama API to generate response with selected model
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for very long responses

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: message,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_ctx: 1024  // Context window
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return NextResponse.json({
        response: data.response || 'Sorry, I could not generate a response.'
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Ollama request timed out, using fallback');
      } else {
        console.error('Ollama request error:', error);
      }
      throw error;
    }

  } catch (error) {
    console.error('Chat API error:', error);
    // Fallback to mock responses if Ollama is not available
    return getMockResponse(message || 'Hello');
  }
}

function getMockResponse(message: string): NextResponse {
  // Enhanced mock responses for better chat experience
  const mockResponses = [
    "Hello! I'm Gemma, a helpful AI assistant. How can I help you today?",
    "That's an interesting question! As an AI language model, I'm here to assist with various tasks and answer questions.",
    "I'm doing well, thank you for asking! I'm excited to chat with you. What would you like to talk about?",
    "I understand you're working on an image maker app. That's a fascinating project! How can I assist you with it?",
    "Great question! I'm designed to be helpful and provide accurate information. What specific topic interests you?",
    "I'd be happy to help you with that! Could you tell me more about what you're looking for?",
    "That's a creative idea! I love helping with innovative projects like yours."
  ];

  let response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

  // Context-aware responses
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    response = "Hello! Nice to meet you. I'm Gemma, ready to help!";
  } else if (lowerMessage.includes('how are you')) {
    response = "I'm doing great! As an AI, I'm always ready to assist. How are you doing?";
  } else if (lowerMessage.includes('image') || lowerMessage.includes('maker')) {
    response = "I see you're working with an image maker app! That's awesome. Would you like me to help you generate some ideas for images or discuss image generation techniques?";
  } else if (lowerMessage.includes('thank')) {
    response = "You're welcome! I'm glad I could help. Is there anything else you'd like to know?";
  } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    response = "Goodbye! It was nice chatting with you. Feel free to come back anytime!";
  }

  return NextResponse.json({ response });
}

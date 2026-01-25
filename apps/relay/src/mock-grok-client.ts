import type { GrokConnectionOptions, GrokConnection } from './grok-client.js';

/**
 * Mock Grok client for testing without real API calls.
 * Simulates the Grok Voice API behavior for local development.
 */
export async function connectToMockGrok(
  merchantId: string,
  options: GrokConnectionOptions
): Promise<GrokConnection> {
  console.log(`[MockGrok] Connecting for merchant: ${merchantId}`);

  // Simulate connection delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Send initial greeting audio (in a real scenario, this would be actual audio)
  setTimeout(() => {
    options.onTranscript(
      'Good morning, thank you for calling. How can I help you today?',
      'assistant'
    );
    // In production, this would be actual g711_ulaw audio
    // For mock, we just acknowledge
  }, 1000);

  let audioChunks: string[] = [];
  let silenceTimer: NodeJS.Timeout | null = null;

  return {
    sendAudio: (audioBase64: string) => {
      audioChunks.push(audioBase64);

      // Reset silence timer on each audio chunk
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      // Simulate VAD - after 500ms of silence, process the "utterance"
      silenceTimer = setTimeout(() => {
        if (audioChunks.length > 0) {
          // Simulate transcription
          const mockTranscript = simulateTranscription(audioChunks.length);
          options.onTranscript(mockTranscript, 'user');

          // Simulate AI response
          simulateResponse(mockTranscript, options);

          audioChunks = [];
        }
      }, 500);
    },

    close: () => {
      console.log('[MockGrok] Connection closed');
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    },
  };
}

function simulateTranscription(chunkCount: number): string {
  // In a real scenario, we'd transcribe actual audio
  // For mock, return sample utterances based on randomness
  const utterances = [
    "I'd like to book an appointment please",
    "What time slots do you have available tomorrow?",
    "Can you check my booking?",
    "I need to cancel my appointment",
    "What services do you offer?",
    "What are your opening hours?",
    "Can I leave a message?",
    "Hello, is anyone there?",
  ];

  const randomIndex = Math.floor(Math.random() * utterances.length);
  return utterances[randomIndex] ?? utterances[0] ?? "Hello";
}

async function simulateResponse(
  userText: string,
  options: GrokConnectionOptions
): Promise<void> {
  const lowerText = userText.toLowerCase();

  // Simulate tool calls based on user input
  if (lowerText.includes('book') || lowerText.includes('appointment')) {
    // Check availability first
    await simulateToolCall(options, 'checkAvailability', {
      date: new Date().toISOString().split('T')[0],
    });

    const response =
      "I'd be happy to help you book an appointment. I have slots available at 10am, 2pm, and 4pm. Which would you prefer?";
    options.onTranscript(response, 'assistant');
  } else if (lowerText.includes('cancel')) {
    const response =
      "I can help you cancel an appointment. Can you confirm your phone number so I can look up your booking?";
    options.onTranscript(response, 'assistant');
  } else if (lowerText.includes('message')) {
    const response =
      "Of course, I can take a message for you. What would you like me to pass along?";
    options.onTranscript(response, 'assistant');
  } else if (lowerText.includes('hours') || lowerText.includes('open')) {
    const response =
      "We're open Monday to Friday from 9am to 5pm, and Saturday from 10am to 2pm. Is there anything else I can help you with?";
    options.onTranscript(response, 'assistant');
  } else {
    const response =
      "I'm sorry, I didn't quite catch that. Could you please repeat what you need help with?";
    options.onTranscript(response, 'assistant');
  }
}

async function simulateToolCall(
  options: GrokConnectionOptions,
  toolName: string,
  params: Record<string, unknown>
): Promise<void> {
  console.log(`[MockGrok] Simulating tool call: ${toolName}`, params);

  try {
    const result = await options.onToolCall(toolName, params);
    console.log(`[MockGrok] Tool result:`, result);
  } catch (error) {
    console.error(`[MockGrok] Tool error:`, error);
  }
}

/**
 * Check if mock mode is enabled via environment variable
 * Only use mock when explicitly set - don't auto-enable in development
 */
export function isMockModeEnabled(): boolean {
  return process.env['MOCK_GROK'] === 'true';
}

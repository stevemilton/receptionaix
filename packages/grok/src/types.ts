export interface GrokConnectionOptions {
  onAudio: (audioBase64: string) => void;
  onToolCall: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  onTranscript: (text: string, speaker: 'user' | 'assistant') => void;
  onError: (error: Error) => void;
}

export interface GrokConnection {
  sendAudio: (audioBase64: string) => void;
  close: () => void;
}

export interface GrokMessage {
  type: GrokMessageType;
  data: {
    audio?: string;
    text?: string;
    speaker?: 'user' | 'assistant';
    tool_call_id?: string;
    name?: string;
    arguments?: string;
    message?: string;
    code?: string;
    reason?: string;
  };
}

export type GrokMessageType =
  | 'connection_ack'
  | 'output_audio'
  | 'transcript'
  | 'tool_call'
  | 'tool_call_cancelled'
  | 'error'
  | 'session_end';

export interface GrokConnectionInit {
  type: 'connection_init';
  data: {
    model_id: string;
    voice: {
      id: string;
      speed: number;
    };
    input_audio_format: 'g711_ulaw';
    output_audio_format: 'g711_ulaw';
    turn_detection: {
      type: 'server_vad';
      threshold?: number;
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
    };
    instructions: string;
    tools: unknown[];
    initial_message?: string;
  };
}

export interface GrokInputAudio {
  type: 'input_audio';
  data: {
    audio: string;
  };
}

export interface GrokToolResult {
  type: 'tool_result';
  data: {
    tool_call_id: string;
    result?: string;
    error?: string;
  };
}

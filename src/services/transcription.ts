import * as FileSystem from 'expo-file-system';
import { getErrorMessage } from '../utils/errors';
import { API_BASE_URL, MODELS, getRequestHeaders } from './apiClient';

// ============ Configuration ============

const TRANSCRIPTION_CONFIG = {
  model: MODELS.transcription,
  maxFileSizeMb: 100, // Voxtral supports up to 30 min audio
};

// ============ Error Types ============

export type TranscriptionErrorCode =
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'API_ERROR'
  | 'EMPTY_RESULT';

export class TranscriptionError extends Error {
  constructor(message: string, public code: TranscriptionErrorCode) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

// ============ Audio Format Detection ============

function getAudioFormat(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    wav: 'wav',
    mp3: 'mp3',
    m4a: 'm4a',
    aac: 'aac',
    ogg: 'ogg',
    flac: 'flac',
    aiff: 'aiff',
  };
  return formatMap[extension || ''] || 'm4a'; // Default to m4a (iOS recording format)
}

// ============ Main Function ============

export async function transcribeAudio(audioUri: string): Promise<string> {
  // Verify file exists
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) {
    throw new TranscriptionError('Audio file not found', 'FILE_NOT_FOUND');
  }

  // Check file size
  if (fileInfo.size) {
    const fileSizeMb = fileInfo.size / (1024 * 1024);
    if (fileSizeMb > TRANSCRIPTION_CONFIG.maxFileSizeMb) {
      throw new TranscriptionError(
        `Audio file too large (${fileSizeMb.toFixed(1)}MB, max ${TRANSCRIPTION_CONFIG.maxFileSizeMb}MB)`,
        'FILE_TOO_LARGE'
      );
    }
  }

  try {
    // Read file as base64
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Detect audio format from file extension
    const audioFormat = getAudioFormat(audioUri);

    // Build request body for OpenRouter chat completions with audio
    const requestBody = {
      model: TRANSCRIPTION_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe this audio. Output only the transcription text, nothing else.',
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: audioFormat,
              },
            },
          ],
        },
      ],
      temperature: 0, // Use 0 for transcription accuracy
      max_tokens: 4096,
    };

    // Make API request to OpenRouter
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getRequestHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 401) {
        throw new TranscriptionError(
          'Authentication failed. Please contact support.',
          'API_ERROR'
        );
      }

      if (response.status === 429) {
        throw new TranscriptionError(
          'Rate limit exceeded. Please wait a moment and try again.',
          'API_ERROR'
        );
      }

      throw new TranscriptionError(
        `Transcription failed: ${errorText}`,
        'API_ERROR'
      );
    }

    const result = await response.json();

    // Extract transcription from chat completion response
    const transcription = result.choices?.[0]?.message?.content;

    if (!transcription?.trim()) {
      throw new TranscriptionError(
        'No speech detected in the recording. Please try again.',
        'EMPTY_RESULT'
      );
    }

    return transcription.trim();
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError(
      `Transcription failed: ${getErrorMessage(error)}`,
      'API_ERROR'
    );
  }
}


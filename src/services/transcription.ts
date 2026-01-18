import * as FileSystem from 'expo-file-system';
import { getWhisperApiKey } from './storage';

// ============ Configuration ============

const WHISPER_CONFIG = {
  apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
  model: 'whisper-1',
  language: 'en',
  maxFileSizeMb: 25,
};

// ============ Error Types ============

export type TranscriptionErrorCode =
  | 'NO_API_KEY'
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

// ============ Main Function ============

export async function transcribeAudio(audioUri: string): Promise<string> {
  // Verify API key
  const apiKey = await getWhisperApiKey();
  if (!apiKey) {
    throw new TranscriptionError(
      'Whisper API key not configured. Please add your OpenAI API key in Settings.',
      'NO_API_KEY'
    );
  }

  // Verify file exists
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) {
    throw new TranscriptionError('Audio file not found', 'FILE_NOT_FOUND');
  }

  // Check file size
  if (fileInfo.size) {
    const fileSizeMb = fileInfo.size / (1024 * 1024);
    if (fileSizeMb > WHISPER_CONFIG.maxFileSizeMb) {
      throw new TranscriptionError(
        `Audio file too large (${fileSizeMb.toFixed(1)}MB, max ${WHISPER_CONFIG.maxFileSizeMb}MB)`,
        'FILE_TOO_LARGE'
      );
    }
  }

  try {
    // Read file as base64
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob for form data
    const audioBlob = await fetch(`data:audio/m4a;base64,${base64Audio}`).then(
      (r) => r.blob()
    );

    // Create form data
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', WHISPER_CONFIG.model);
    formData.append('language', WHISPER_CONFIG.language);
    formData.append('response_format', 'text');

    // Make API request
    const response = await fetch(WHISPER_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 401) {
        throw new TranscriptionError(
          'Invalid OpenAI API key. Please check your settings.',
          'API_ERROR'
        );
      }

      throw new TranscriptionError(
        `Transcription failed: ${errorText}`,
        'API_ERROR'
      );
    }

    const transcription = await response.text();

    if (!transcription.trim()) {
      throw new TranscriptionError(
        'No speech detected in the recording. Please try again.',
        'EMPTY_RESULT'
      );
    }

    return transcription.trim();
  } catch (error: any) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError(
      `Transcription failed: ${error.message}`,
      'API_ERROR'
    );
  }
}

// ============ Utilities ============

/**
 * Estimate transcription cost
 * Whisper API: $0.006 per minute
 */
export function estimateCost(durationMs: number): number {
  const minutes = durationMs / 60000;
  return minutes * 0.006;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '< $0.01';
  }
  return `$${cost.toFixed(2)}`;
}

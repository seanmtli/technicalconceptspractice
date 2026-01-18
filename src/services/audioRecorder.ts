import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// ============ Configuration ============

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// Maximum recording duration: 5 minutes
const MAX_DURATION_MS = 300000;

// ============ Error Types ============

export type AudioRecordingErrorCode =
  | 'PERMISSION_DENIED'
  | 'ALREADY_RECORDING'
  | 'NOT_RECORDING'
  | 'HARDWARE_ERROR'
  | 'STORAGE_ERROR';

export class AudioRecordingError extends Error {
  constructor(message: string, public code: AudioRecordingErrorCode) {
    super(message);
    this.name = 'AudioRecordingError';
  }
}

// ============ State Tracking ============

let currentRecording: Audio.Recording | null = null;
let recordingStartTime: number | null = null;

// ============ Permission Functions ============

export async function requestPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ============ Recording Functions ============

export async function startRecording(): Promise<void> {
  // Check if already recording
  if (currentRecording) {
    throw new AudioRecordingError('Already recording', 'ALREADY_RECORDING');
  }

  // Check permissions
  const hasPermission = await hasPermissions();
  if (!hasPermission) {
    const granted = await requestPermissions();
    if (!granted) {
      throw new AudioRecordingError(
        'Microphone permission denied',
        'PERMISSION_DENIED'
      );
    }
  }

  try {
    // Configure audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create and start recording
    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

    currentRecording = recording;
    recordingStartTime = Date.now();
  } catch (error: any) {
    throw new AudioRecordingError(
      `Failed to start recording: ${error.message}`,
      'HARDWARE_ERROR'
    );
  }
}

export async function stopRecording(): Promise<{
  uri: string;
  durationMs: number;
}> {
  if (!currentRecording) {
    throw new AudioRecordingError('Not currently recording', 'NOT_RECORDING');
  }

  try {
    await currentRecording.stopAndUnloadAsync();

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = currentRecording.getURI();
    const durationMs = recordingStartTime ? Date.now() - recordingStartTime : 0;

    if (!uri) {
      throw new AudioRecordingError('Recording file not found', 'STORAGE_ERROR');
    }

    // Verify file exists and has content
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new AudioRecordingError('Recording file not found', 'STORAGE_ERROR');
    }

    currentRecording = null;
    recordingStartTime = null;

    return { uri, durationMs };
  } catch (error: any) {
    currentRecording = null;
    recordingStartTime = null;

    if (error instanceof AudioRecordingError) throw error;
    throw new AudioRecordingError(
      `Failed to stop recording: ${error.message}`,
      'HARDWARE_ERROR'
    );
  }
}

export async function cancelRecording(): Promise<void> {
  if (currentRecording) {
    try {
      const uri = currentRecording.getURI();
      await currentRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // Ignore cleanup errors
    }
    currentRecording = null;
    recordingStartTime = null;
  }
}

export async function deleteRecording(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Ignore deletion errors
  }
}

// ============ State Getters ============

export function isRecording(): boolean {
  return currentRecording !== null;
}

export function getRecordingDuration(): number {
  if (!recordingStartTime) return 0;
  return Date.now() - recordingStartTime;
}

export function getMaxDuration(): number {
  return MAX_DURATION_MS;
}

// ============ Utilities ============

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

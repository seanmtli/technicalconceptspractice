/**
 * Error handling utilities for consistent error processing across the app.
 */

/**
 * Safely extracts an error message from an unknown error type.
 * Handles Error objects, strings, and objects with a message property.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'An unknown error occurred';
}

/**
 * Type guard to check if an error has a specific error code property.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Type guard to check if an error has a status property.
 */
export function hasStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Safely checks if error message contains a specific substring.
 */
export function errorContains(error: unknown, substring: string): boolean {
  const message = getErrorMessage(error);
  return message.toLowerCase().includes(substring.toLowerCase());
}

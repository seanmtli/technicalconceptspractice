/**
 * Centralized logger for the application.
 * Provides environment-aware logging with consistent formatting.
 */

const isDev = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  context?: string;
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`.trim();
}

function shouldLog(level: LogLevel): boolean {
  // Always log errors and warnings
  if (level === 'error' || level === 'warn') {
    return true;
  }
  // Only log debug/info in development
  return isDev;
}

export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug(message: string, data?: unknown, options?: LoggerOptions): void {
    if (shouldLog('debug')) {
      const formatted = formatMessage('debug', message, options?.context);
      if (data !== undefined) {
        console.log(formatted, data);
      } else {
        console.log(formatted);
      }
    }
  },

  /**
   * Info-level logging (development only)
   */
  info(message: string, data?: unknown, options?: LoggerOptions): void {
    if (shouldLog('info')) {
      const formatted = formatMessage('info', message, options?.context);
      if (data !== undefined) {
        console.log(formatted, data);
      } else {
        console.log(formatted);
      }
    }
  },

  /**
   * Warning-level logging (always logged)
   */
  warn(message: string, data?: unknown, options?: LoggerOptions): void {
    if (shouldLog('warn')) {
      const formatted = formatMessage('warn', message, options?.context);
      if (data !== undefined) {
        console.warn(formatted, data);
      } else {
        console.warn(formatted);
      }
    }
  },

  /**
   * Error-level logging (always logged)
   */
  error(message: string, error?: unknown, options?: LoggerOptions): void {
    if (shouldLog('error')) {
      const formatted = formatMessage('error', message, options?.context);
      if (error !== undefined) {
        console.error(formatted, error);
      } else {
        console.error(formatted);
      }
    }
  },
};

export default logger;

/**
 * OpenRouter chat client. Server-side only — never import from client components.
 * Ported retry/validation behavior: exponential backoff, non-retryable short-circuit,
 * markdown-fence stripping, score/array coercion.
 */

export type ApiErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export const EVAL_MODEL = process.env.OPENROUTER_EVAL_MODEL ?? 'anthropic/claude-sonnet-4.5';
export const CHEAP_MODEL = process.env.OPENROUTER_CHEAP_MODEL ?? 'google/gemini-2.5-flash';

export function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError('Failed to parse model response as JSON', 'INVALID_RESPONSE', true);
  }
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (error instanceof ApiError && !error.retryable) throw error;
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export async function chat(
  prompt: string,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ApiError('OPENROUTER_API_KEY not configured', 'AUTH_ERROR', false);

  return withRetry(async () => {
    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.model ?? EVAL_MODEL,
          max_tokens: opts.maxTokens ?? 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ApiError('Request timed out', 'TIMEOUT', true);
      }
      throw new ApiError('Network error reaching OpenRouter', 'NETWORK', true);
    }

    if (!response.ok) {
      if (response.status === 429) throw new ApiError('Rate limit exceeded', 'RATE_LIMIT', true);
      if (response.status === 401) throw new ApiError('OpenRouter auth failed', 'AUTH_ERROR', false);
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        `OpenRouter error: ${errorData.error?.message || response.statusText}`,
        'UNKNOWN',
        true
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new ApiError('Empty response from model', 'INVALID_RESPONSE', true);
    return text;
  });
}

/**
 * Ask for JSON, parse and coerce. On a malformed first reply, retries once with a
 * "return only JSON" nudge appended.
 */
export async function chatJson<T>(
  prompt: string,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<T> {
  try {
    return parseJsonResponse<T>(await chat(prompt, opts));
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INVALID_RESPONSE') {
      const nudged = `${prompt}\n\nIMPORTANT: Respond with ONLY the JSON object. No prose, no markdown fences.`;
      return parseJsonResponse<T>(await chat(nudged, opts));
    }
    throw error;
  }
}

interface RawEvaluation {
  score: unknown;
  whatWasCoveredWell?: unknown;
  whatWasMissing?: unknown;
  missedConcepts?: unknown;
  modelAnswer?: unknown;
  fullFeedback?: unknown;
  goDeeper?: unknown;
}

export interface ValidatedEvaluation {
  score: number;
  whatWasCoveredWell: string;
  whatWasMissing: string;
  missedConcepts: string[];
  modelAnswer: string;
  fullFeedback: string;
  goDeeper: { title: string; url: string }[];
}

/** Coerce/validate the LLM's evaluation JSON. Throws INVALID_RESPONSE if unusable. */
export function validateEvaluation(raw: RawEvaluation): ValidatedEvaluation {
  const score = Math.round(Number(raw.score));
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw new ApiError('Invalid score in evaluation response', 'INVALID_RESPONSE', true);
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const missedConcepts = Array.isArray(raw.missedConcepts)
    ? raw.missedConcepts.filter((c): c is string => typeof c === 'string')
    : [];
  const goDeeper = Array.isArray(raw.goDeeper)
    ? raw.goDeeper
        .filter(
          (l): l is { title: string; url: string } =>
            typeof l === 'object' &&
            l !== null &&
            typeof (l as { title?: unknown }).title === 'string' &&
            typeof (l as { url?: unknown }).url === 'string'
        )
        .filter((l) => l.url.startsWith('https://'))
    : [];

  return {
    score,
    whatWasCoveredWell: str(raw.whatWasCoveredWell),
    whatWasMissing: str(raw.whatWasMissing),
    missedConcepts,
    modelAnswer: str(raw.modelAnswer),
    fullFeedback: str(raw.fullFeedback),
    goDeeper,
  };
}

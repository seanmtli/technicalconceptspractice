import { AIEvaluationResponse, GeneratedQuestion, Difficulty, Category } from '../types';
import { buildEnhancedContext } from './knowledgeEnhancer';
import { getErrorMessage, errorContains } from '../utils/errors';
import { MODELS, isApiKeyConfigured, API_BASE_URL, getRequestHeaders } from './apiClient';
import { logger } from '../utils/logger';

const API_CONFIG = {
  model: MODELS.chat,
  maxTokens: 1024,
  maxRetries: 2,
  retryDelayMs: 1000,
};

// ============ Error Types ============

export type ClaudeApiErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public code: ClaudeApiErrorCode,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

// ============ JSON Parsing ============

function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new ClaudeApiError(
      `Failed to parse API response as JSON`,
      'INVALID_RESPONSE',
      false
    );
  }
}

// ============ Retry Logic ============

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = API_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-retryable errors
      if (error instanceof ClaudeApiError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = API_CONFIG.retryDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ============ Evaluation Prompt ============

const EVALUATION_PROMPT = `You are a strict but fair data science interviewer evaluating a candidate's explanation. Grade rigorously as if in a technical interview.

## Question
{question}

## Key Concepts Expected
The answer MUST cover these concepts:
{keyConcepts}

## Student's Answer
{userAnswer}

## Your Task
Evaluate strictly and provide feedback with LENGTH PROPORTIONAL TO ERRORS:
- If the answer is excellent (score 5): Keep feedback brief (1-2 sentences)
- If the answer has gaps (score 3-4): Moderate feedback explaining what's missing
- If the answer is weak (score 1-2): Detailed feedback with thorough explanations of correct concepts

Respond in this exact JSON format:
{
  "score": <1-5>,
  "whatWasCoveredWell": "<specific points explained correctly - be brief if few>",
  "whatWasMissing": "<list each missing/incorrect concept specifically>",
  "missedConcepts": ["<concept1>", "<concept2>"],
  "modelAnswer": "<complete model answer - length proportional to how much was missed>",
  "fullFeedback": "<corrective feedback - brief for good answers, detailed for weak ones>"
}

Scoring Guide (STRICT):
- 5: All key concepts covered accurately AND explained clearly with proper terminology
- 4: All key concepts mentioned but explanation lacks depth or precision
- 3: Core concept understood but 1-2 key concepts missing or incorrect
- 2: Partial understanding, multiple key concepts missing or confused
- 1: Fundamental misunderstanding or mostly incorrect

The "missedConcepts" array should contain concepts from the expected list that were missing or incorrect. If the answer is excellent, this should be an empty array.

Be direct about errors. Don't soften criticism. The goal is interview preparation.`;

// ============ Generation Prompt ============

const GENERATION_PROMPT = `You are an expert data science educator creating flashcard questions for self-study.

## Request
Generate {count} practice questions for:
- Category: {category}
- Difficulty: {difficulty}
- Sub-topic (optional): {subTopic}
{enhancedContext}

## Requirements
Each question should:
1. Ask the student to EXPLAIN a concept (not just define it)
2. Require demonstration of understanding, not just recall
3. Be answerable in 2-4 paragraphs of written explanation
4. Test practical understanding, trade-offs, and real-world application

## Difficulty Guidelines
- Beginner: Foundational concepts, "What is X and why do we use it?"
- Intermediate: Application and comparison, "How does X differ from Y?"
- Advanced: Edge cases, trade-offs, "When would X fail and what alternatives exist?"

Respond in this exact JSON format:
{
  "questions": [
    {
      "prompt": "<the question text>",
      "keyConcepts": ["<concept1>", "<concept2>", "<concept3>"],
      "difficulty": "{difficulty}"
    }
  ]
}

Make questions specific and practical. Avoid vague or overly broad prompts.`;

// ============ Main Functions ============

export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  keyConcepts: string[]
): Promise<AIEvaluationResponse> {
  // Input validation
  if (!userAnswer.trim()) {
    throw new ClaudeApiError('Answer cannot be empty', 'INVALID_RESPONSE', false);
  }

  if (userAnswer.length > 10000) {
    throw new ClaudeApiError(
      'Answer too long (max 10,000 characters)',
      'INVALID_RESPONSE',
      false
    );
  }

  return withRetry(async () => {
    const prompt = EVALUATION_PROMPT.replace('{question}', question)
      .replace('{keyConcepts}', keyConcepts.join(', '))
      .replace('{userAnswer}', userAnswer);

    try {
      // Use fetch directly for better React Native compatibility
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          model: API_CONFIG.model,
          max_tokens: API_CONFIG.maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new ClaudeApiError(
            'Rate limit exceeded. Please wait a moment.',
            'RATE_LIMIT',
            true
          );
        }
        if (response.status === 401) {
          throw new ClaudeApiError(
            'Authentication failed. Please contact support.',
            'AUTH_ERROR',
            false
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new ClaudeApiError(
          `API error: ${errorData.error?.message || response.statusText}`,
          'UNKNOWN',
          true
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';

      if (!text) {
        throw new ClaudeApiError('Empty response from API', 'INVALID_RESPONSE', true);
      }

      const parsed = parseJsonResponse<AIEvaluationResponse>(text);

      // Validate response structure
      if (
        typeof parsed.score !== 'number' ||
        parsed.score < 1 ||
        parsed.score > 5
      ) {
        throw new ClaudeApiError(
          'Invalid score in response',
          'INVALID_RESPONSE',
          true
        );
      }

      // Ensure missedConcepts is an array
      if (!Array.isArray(parsed.missedConcepts)) {
        parsed.missedConcepts = [];
      }

      return parsed;
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw error;
      }
      if (errorContains(error, 'timeout') || errorContains(error, 'abort')) {
        throw new ClaudeApiError('Request timed out', 'TIMEOUT', true);
      }
      if (errorContains(error, 'network') || errorContains(error, 'fetch')) {
        throw new ClaudeApiError(
          'Network error. Check your connection.',
          'NETWORK',
          true
        );
      }
      logger.error('Evaluation failed', error);
      throw new ClaudeApiError(`API error: ${getErrorMessage(error)}`, 'UNKNOWN', true);
    }
  });
}

export async function generateQuestions(
  category: string,
  difficulty: Difficulty,
  subTopic: string | null,
  count: number,
  categoryId?: Category
): Promise<GeneratedQuestion[]> {
  // Validate API key is configured
  if (!isApiKeyConfigured()) {
    throw new ClaudeApiError(
      'API key not configured. Please add OPENROUTER_API_KEY to .env file.',
      'AUTH_ERROR',
      false
    );
  }

  // Validate count
  if (count < 1 || count > 5) {
    throw new ClaudeApiError(
      'Can only generate 1-5 questions at a time',
      'INVALID_RESPONSE',
      false
    );
  }

  logger.info('Generating questions', { category, difficulty, subTopic, count });

  return withRetry(async () => {
    // Build enhanced context if we have a category ID
    const enhancedContext = categoryId
      ? buildEnhancedContext(categoryId, subTopic)
      : '';

    const prompt = GENERATION_PROMPT.replace('{count}', count.toString())
      .replace('{category}', category)
      .replace(/\{difficulty\}/g, difficulty)
      .replace('{subTopic}', subTopic || 'general')
      .replace('{enhancedContext}', enhancedContext ? `\n${enhancedContext}` : '');

    try {
      // Use fetch directly for better React Native compatibility
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          model: API_CONFIG.model,
          max_tokens: API_CONFIG.maxTokens * 2,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new ClaudeApiError(
            'Rate limit exceeded. Please wait a moment.',
            'RATE_LIMIT',
            true
          );
        }
        if (response.status === 401) {
          throw new ClaudeApiError(
            'Authentication failed. Please check API key.',
            'AUTH_ERROR',
            false
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new ClaudeApiError(
          `API error: ${errorData.error?.message || response.statusText}`,
          'UNKNOWN',
          true
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';

      if (!text) {
        throw new ClaudeApiError('Empty response from API', 'INVALID_RESPONSE', true);
      }

      const parsed = parseJsonResponse<{ questions: GeneratedQuestion[] }>(text);

      // Validate response
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new ClaudeApiError(
          'No questions generated',
          'INVALID_RESPONSE',
          true
        );
      }

      // Ensure difficulty is set correctly
      return parsed.questions.map((q) => ({
        ...q,
        difficulty,
      }));
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw error;
      }
      if (errorContains(error, 'timeout') || errorContains(error, 'abort')) {
        throw new ClaudeApiError('Request timed out', 'TIMEOUT', true);
      }
      if (errorContains(error, 'network') || errorContains(error, 'fetch')) {
        throw new ClaudeApiError(
          'Network error. Check your connection.',
          'NETWORK',
          true
        );
      }
      logger.error('Question generation failed', error);
      throw new ClaudeApiError(`API error: ${getErrorMessage(error)}`, 'UNKNOWN', true);
    }
  });
}


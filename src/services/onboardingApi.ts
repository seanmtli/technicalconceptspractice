import Anthropic from '@anthropic-ai/sdk';
import { OnboardingMessage, OnboardingSuggestion, Category, Difficulty } from '../types';

// OpenRouter Configuration
// IMPORTANT: Replace with your actual OpenRouter API key
// For production, use a backend proxy to hide this key
const OPENROUTER_API_KEY = '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';

const API_CONFIG = {
  model: 'minimax/minimax-m2-her',
  maxTokens: 1024,
};

// ============ Error Types ============

export class OnboardingApiError extends Error {
  constructor(
    message: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'OnboardingApiError';
  }
}

// ============ System Prompt ============

const ONBOARDING_SYSTEM_PROMPT = `You are a friendly career coach helping set up a data science practice app.

Your goal is to understand the user's background and learning goals through a brief, conversational interview.

Ask 2-3 broad questions to understand:
1. Technical experience/background (education, self-taught, years of experience)
2. Current work and how it relates to data/technical skills
3. What they want to learn or improve

Guidelines:
- Be warm, conversational, and concise
- Ask one question at a time
- Keep responses to 2-3 sentences max
- Don't be repetitive if they've already answered something
- After 2-3 exchanges (when you have enough info about their background and goals), end your response with the exact marker: [READY_FOR_SUGGESTIONS]

Available topics for the app:
- Statistics
- Machine Learning
- Python/Pandas
- SQL
- A/B Testing
- Data Visualization
- Feature Engineering

Difficulty levels: beginner, intermediate, advanced

Remember: Keep it brief and friendly. The goal is to get enough context to make good suggestions, not to conduct a lengthy interview.`;

// ============ Extraction Prompt ============

const EXTRACTION_SYSTEM_PROMPT = `You are an assistant that analyzes onboarding conversations and extracts learning preferences.

Based on the conversation, determine:
1. Which data science topics would be most relevant for this user
2. What difficulty level is appropriate for each topic

Respond ONLY with valid JSON in this exact format:
{
  "reasoning": "<1-2 sentence explanation of why you chose these topics>",
  "suggestedCategories": ["<category1>", "<category2>", ...],
  "suggestedDifficulties": {
    "<category1>": "<difficulty>",
    "<category2>": "<difficulty>"
  }
}

Valid categories (use exact strings): "statistics", "machine-learning", "python-pandas", "sql", "ab-testing", "visualization", "feature-engineering"
Valid difficulties: "beginner", "intermediate", "advanced"

Guidelines:
- Include 3-5 most relevant categories based on their goals
- Order categories by relevance (most important first)
- Set difficulty based on their experience level:
  - Students/beginners: mostly beginner, some intermediate
  - Entry-level professionals: intermediate with some beginner
  - Mid-level+: intermediate with some advanced
  - Career changers: depends on their technical background
- Be thoughtful about which topics match their stated goals`;

// ============ Client Management ============

// OpenRouter client with Anthropic SDK compatibility
const client = new Anthropic({
  baseURL: 'https://openrouter.ai/api',
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://datapractice.app',
    'X-Title': 'Data Practice App',
  },
});

function getClient(): Anthropic {
  return client;
}

export function resetOnboardingClient(): void {
  // No-op: client is now statically configured
}

// ============ Main Functions ============

export async function continueOnboardingConversation(
  history: OnboardingMessage[],
  userMessage: string
): Promise<string> {
  const anthropic = getClient();

  // Build messages array with history
  const messages: Anthropic.MessageParam[] = history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Add the new user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await anthropic.messages.create({
      model: API_CONFIG.model,
      max_tokens: API_CONFIG.maxTokens,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages,
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return text;
  } catch (error: any) {
    if (error.status === 429) {
      throw new OnboardingApiError('Rate limit exceeded. Please wait a moment.', true);
    }
    if (error.status === 401) {
      throw new OnboardingApiError('Authentication failed. Please contact support.', false);
    }
    throw new OnboardingApiError(`API error: ${error.message}`, true);
  }
}

export async function getInitialGreeting(): Promise<string> {
  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model: API_CONFIG.model,
      max_tokens: API_CONFIG.maxTokens,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Hi, I just installed the app and want to set up my learning preferences.',
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return text;
  } catch (error: any) {
    if (error.status === 429) {
      throw new OnboardingApiError('Rate limit exceeded. Please wait a moment.', true);
    }
    if (error.status === 401) {
      throw new OnboardingApiError('Authentication failed. Please contact support.', false);
    }
    throw new OnboardingApiError(`API error: ${error.message}`, true);
  }
}

export async function extractPreferencesFromConversation(
  history: OnboardingMessage[]
): Promise<OnboardingSuggestion> {
  const anthropic = getClient();

  // Format conversation for extraction
  const conversationText = history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: API_CONFIG.model,
      max_tokens: API_CONFIG.maxTokens,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Based on this onboarding conversation, extract the user's learning preferences:\n\n${conversationText}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate and normalize response
    const validCategories: Category[] = [
      'statistics',
      'machine-learning',
      'python-pandas',
      'sql',
      'ab-testing',
      'visualization',
      'feature-engineering',
    ];

    const validDifficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

    // Filter to only valid categories
    const suggestedCategories = (parsed.suggestedCategories || [])
      .filter((cat: string) => validCategories.includes(cat as Category)) as Category[];

    // Build difficulties map with defaults
    const suggestedDifficulties: Record<Category, Difficulty> = {} as Record<Category, Difficulty>;
    for (const cat of validCategories) {
      const difficulty = parsed.suggestedDifficulties?.[cat];
      suggestedDifficulties[cat] = validDifficulties.includes(difficulty)
        ? difficulty
        : 'intermediate';
    }

    return {
      reasoning: parsed.reasoning || 'Based on your background, here are my suggestions.',
      suggestedCategories: suggestedCategories.length > 0 ? suggestedCategories : validCategories.slice(0, 4),
      suggestedDifficulties,
    };
  } catch (error: any) {
    // Return sensible defaults on error
    console.error('Failed to extract preferences:', error);
    return {
      reasoning: 'Based on your responses, here are balanced recommendations to get you started.',
      suggestedCategories: ['statistics', 'python-pandas', 'sql', 'machine-learning'],
      suggestedDifficulties: {
        'statistics': 'intermediate',
        'machine-learning': 'intermediate',
        'python-pandas': 'intermediate',
        'sql': 'intermediate',
        'ab-testing': 'intermediate',
        'visualization': 'intermediate',
        'feature-engineering': 'intermediate',
        'llm-fundamentals': 'intermediate',
        'ml-infrastructure': 'intermediate',
        'data-platforms': 'intermediate',
        'fundamentals': 'beginner',
        'devops': 'intermediate',
      },
    };
  }
}

export function isReadyForSuggestions(response: string): boolean {
  return response.includes('[READY_FOR_SUGGESTIONS]');
}

export function cleanResponseForDisplay(response: string): string {
  return response.replace('[READY_FOR_SUGGESTIONS]', '').trim();
}

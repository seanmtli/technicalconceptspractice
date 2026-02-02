import { OnboardingMessage, OnboardingSuggestion, Category, Difficulty } from '../types';
import { logger } from '../utils/logger';
import { API_BASE_URL, MODELS, getRequestHeaders } from './apiClient';

const API_CONFIG = {
  model: MODELS.chat,
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

const ONBOARDING_SYSTEM_PROMPT = `You are a friendly coach helping set up a technical concepts learning app.

CONTEXT ABOUT THIS APP (use this to frame your questions):
This app helps users truly understand and explain technical concepts - not just memorize definitions. Many people can sound fluent about AI tools or technologies without really understanding them. This app fights "parrot syndrome" - where someone sounds coherent but can't go one level deeper. Users practice explaining concepts in real-world business contexts: choosing the right model for a situation, tradeoffs between architectures, etc. They speak or type answers, and an AI grades their explanation and provides feedback. Think of it as Anki for technical fluency - great for PMs wanting to be more technical, or anyone who needs to explain technical feasibility to stakeholders.

YOUR GOAL:
Understand the user's background and what they want to get better at explaining. Ask up to 3-4 questions max.

QUESTIONS TO EXPLORE:
1. Their current role and technical background
2. What technical concepts they struggle to explain confidently
3. Situations where they need to sound technically credible (stakeholder meetings, interviews, etc.)
4. Specific topics they want to master (AI/ML, data engineering, software architecture, etc.)

GUIDELINES:
- Be warm and conversational
- Ask ONE question at a time
- Encourage them to share details about their goals
- After 3-4 exchanges (or when you have enough context), end with [READY_FOR_SUGGESTIONS]
- If they give detailed answers early, you can wrap up sooner

Available topics: Statistics, Machine Learning, Python/Pandas, SQL, A/B Testing, Data Visualization, Feature Engineering, LLM Fundamentals, ML Infrastructure, Data Platforms, Software Fundamentals, DevOps`;

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

Valid categories (use exact strings): "statistics", "machine-learning", "python-pandas", "sql", "ab-testing", "visualization", "feature-engineering", "llm-fundamentals", "ml-infrastructure", "data-platforms", "fundamentals", "devops"
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

// ============ API Helper ============

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      model: API_CONFIG.model,
      max_tokens: API_CONFIG.maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new OnboardingApiError('Rate limit exceeded. Please wait a moment.', true);
    }
    if (response.status === 401) {
      throw new OnboardingApiError('Authentication failed. Please check API key.', false);
    }
    throw new OnboardingApiError(`API error: ${error.error?.message || response.statusText}`, true);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ============ Main Functions ============

export async function continueOnboardingConversation(
  history: OnboardingMessage[],
  userMessage: string
): Promise<string> {
  // Build messages array with system prompt and history
  const messages: ChatMessage[] = [
    { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return callOpenRouter(messages);
}

export async function getInitialGreeting(): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
    { role: 'user', content: 'Hi, I just installed the app and want to set up my learning preferences.' },
  ];

  return callOpenRouter(messages);
}

export async function extractPreferencesFromConversation(
  history: OnboardingMessage[]
): Promise<OnboardingSuggestion> {
  // Format conversation for extraction
  const conversationText = history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `Based on this onboarding conversation, extract the user's learning preferences:\n\n${conversationText}` },
    ];

    const text = await callOpenRouter(messages);

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
      'llm-fundamentals',
      'ml-infrastructure',
      'data-platforms',
      'fundamentals',
      'devops',
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
    // Add new categories with defaults
    suggestedDifficulties['llm-fundamentals'] = 'intermediate';
    suggestedDifficulties['ml-infrastructure'] = 'intermediate';
    suggestedDifficulties['data-platforms'] = 'intermediate';
    suggestedDifficulties['fundamentals'] = 'beginner';
    suggestedDifficulties['devops'] = 'intermediate';

    return {
      reasoning: parsed.reasoning || 'Based on your background, here are my suggestions.',
      suggestedCategories: suggestedCategories.length > 0 ? suggestedCategories : validCategories.slice(0, 4),
      suggestedDifficulties,
    };
  } catch (error) {
    // Return sensible defaults on error
    logger.error('Failed to extract preferences', error);
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

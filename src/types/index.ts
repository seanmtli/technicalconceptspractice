// Category types for data science topics
export type Category =
  | 'statistics'
  | 'machine-learning'
  | 'python-pandas'
  | 'sql'
  | 'ab-testing'
  | 'visualization'
  | 'feature-engineering';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// Onboarding types
export type ExperienceLevel = 'student' | 'entry' | 'mid' | 'senior' | 'career-change';
export type LearningTimeline = '1-month' | '3-months' | '6-months' | 'ongoing';

export interface UserPreferences {
  experienceLevel: ExperienceLevel | null;
  currentRole: string | null;
  technicalBackground: string | null;
  preferredCategories: Category[];  // Ordered by priority
  preferredDifficulties: Record<Category, Difficulty>;
  onboardingCompletedAt: string | null;
  updatedAt: string;
}

export interface OnboardingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingSuggestion {
  reasoning: string;
  suggestedCategories: Category[];
  suggestedDifficulties: Record<Category, Difficulty>;
}

// Core data models
export interface Question {
  id: string;
  prompt: string;
  category: Category;
  difficulty: Difficulty;
  keyConcepts: string[];
  isCustom: boolean;
  createdAt: string; // ISO date string
}

export interface ReviewRecord {
  id: string;
  questionId: string;
  userAnswer: string;
  answerType: AnswerType;
  score: number;
  aiFeedback: string;
  whatWasCoveredWell: string;
  whatWasMissing: string;
  missedConcepts: string[];
  modelAnswer: string;
  reviewedAt: string;
}

export interface CardSchedule {
  questionId: string;
  nextReviewDate: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface UserStats {
  totalReviews: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
}

// AI response types
export interface AIEvaluationResponse {
  score: number;
  whatWasCoveredWell: string;
  whatWasMissing: string;
  missedConcepts: string[];
  modelAnswer: string;
  fullFeedback: string;
}

export interface GeneratedQuestion {
  prompt: string;
  keyConcepts: string[];
  difficulty: Difficulty;
}

// Concept gap tracking
export interface ConceptGap {
  concept: string;
  category: Category;
  missedCount: number;
  lastMissedAt: string;
  questionIds: string[];
}

// Practice session tracking
export interface PracticeSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  cardsReviewed: number;
  averageScore: number;
  wasCompleted: boolean;
}

// Answer types
export type AnswerType = 'text' | 'audio';

export interface UserAnswer {
  content: string;
  type: AnswerType;
  audioUri?: string;
}

// Category display info
export interface CategoryInfo {
  id: Category;
  label: string;
  color: string;
  icon: string;
}

// Stats by category
export interface CategoryStats {
  category: Category;
  totalQuestions: number;
  reviewedCount: number;
  averageScore: number;
  masteredCount: number; // interval > 7 days
}

// Navigation types
export type RootTabParamList = {
  HomeTab: undefined;
  ProgressTab: undefined;
  QuestionsTab: undefined;
  SettingsTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Practice: { sessionId: string };
  SessionComplete: { sessionId: string; cardsReviewed: number; avgScore: number };
};

export type QuestionsStackParamList = {
  QuestionBank: undefined;
  QuestionDetail: { questionId: string };
  GenerateQuestions: undefined;
  AddCustomQuestion: undefined;
};

// Onboarding navigation types
export type OnboardingStackParamList = {
  OnboardingChat: undefined;
  PreferencesReview: { suggestions: OnboardingSuggestion };
};

// Practice screen state machine
export type ProcessingStep = 'transcribing' | 'evaluating';

export type PracticeState =
  | { status: 'loading' }
  | { status: 'no_cards' }
  | { status: 'answering'; question: Question }
  | { status: 'recording'; question: Question }
  | { status: 'processing'; question: Question; step: ProcessingStep }
  | { status: 'feedback'; question: Question; feedback: AIEvaluationResponse }
  | { status: 'session_complete' }
  | { status: 'error'; error: string; retryable: boolean };

// App context state
export interface AppState {
  isOnline: boolean;
  hasClaudeApiKey: boolean;
  hasWhisperApiKey: boolean;
  isInitialized: boolean;
  currentSessionId: string | null;
  hasCompletedOnboarding: boolean;
  userPreferences: UserPreferences | null;
}

export type AppAction =
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_API_KEYS'; payload: { claude: boolean; whisper: boolean } }
  | { type: 'SET_INITIALIZED' }
  | { type: 'SET_SESSION'; payload: string | null }
  | { type: 'SET_ONBOARDING_COMPLETE'; payload: { completed: boolean; preferences: UserPreferences | null } }
  | { type: 'UPDATE_PREFERENCES'; payload: UserPreferences };

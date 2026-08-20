export type Category =
  | 'statistics'
  | 'machine-learning'
  | 'python-pandas'
  | 'sql'
  | 'ab-testing'
  | 'visualization'
  | 'feature-engineering'
  | 'llm-fundamentals'
  | 'ml-infrastructure'
  | 'data-platforms'
  | 'fundamentals'
  | 'devops'
  | 'system-design'
  | 'ai-agents';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type QuestionMode = 'drill' | 'contextual';

export type AnswerType = 'text' | 'audio';

export interface SourceReference {
  url: string;
  title: string;
  accessLevel: 'free' | 'partial';
}

export interface Question {
  id: string;
  prompt: string;
  category: Category;
  difficulty: Difficulty;
  mode: QuestionMode;
  keyConcepts: string[];
  sourceIds: string[];
  isCustom: boolean;
  createdAt: string;
}

export interface Source {
  id: string;
  url: string;
  title: string;
  publication: 'bytebytego' | 'technically';
  summary: string;
  concepts: string[];
}

export interface CardSchedule {
  questionId: string;
  nextReviewDate: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface GoDeeperLink {
  title: string;
  url: string;
}

export interface EvaluationResult {
  score: number;
  whatWasCoveredWell: string;
  whatWasMissing: string;
  missedConcepts: string[];
  modelAnswer: string;
  fullFeedback: string;
  goDeeper: GoDeeperLink[];
  streak: number;
  persisted: boolean;
}

export interface UserStats {
  totalReviews: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
}

/** A card in the practice queue: a bank question or an ephemeral generated one. */
export interface PracticeCard {
  question: Question;
  ephemeral: boolean;
}

export type ProcessingStep = 'transcribing' | 'evaluating';

export type PracticeState =
  | { status: 'loading' }
  | { status: 'no_cards' }
  | { status: 'answering'; card: PracticeCard }
  | { status: 'recording'; card: PracticeCard }
  | { status: 'confirming'; card: PracticeCard; transcript: string }
  | { status: 'processing'; card: PracticeCard; step: ProcessingStep }
  | { status: 'feedback'; card: PracticeCard; feedback: EvaluationResult }
  | { status: 'session_complete' }
  | { status: 'error'; error: string; retryable: boolean };

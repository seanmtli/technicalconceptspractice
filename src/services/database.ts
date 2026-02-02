import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  Question,
  CardSchedule,
  ReviewRecord,
  UserStats,
  ConceptGap,
  PracticeSession,
  CategoryStats,
  Category,
  Difficulty,
  UserPreferences,
  OnboardingMessage,
} from '../types';
import { SEED_QUESTIONS } from '../data/seedQuestions';
import { TECHNICALLY_DEV_QUESTIONS } from '../data/technicallyDevQuestions';
import { TECHNICAL_DEFINITIONS } from '../data/technicalDefinitions';
import { logger } from '../utils/logger';

const DATABASE_NAME = 'datapractice.db';
const CURRENT_SCHEMA_VERSION = 5;

// All valid categories for CHECK constraint
const VALID_CATEGORIES = [
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

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database connection
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initDatabase(db);
  }
  return db;
}

// Initialize database schema
async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create schema version table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  // Check current version
  const result = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1'
  );
  const currentVersion = result?.version ?? 0;

  if (currentVersion === 0) {
    // Fresh install - create all tables
    await createTables(database);
    await database.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      CURRENT_SCHEMA_VERSION
    );
    // Seed initial questions
    await seedQuestions(database);
  } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Run migrations
    await runMigrations(database, currentVersion);
  }
}

// Create all tables
async function createTables(database: SQLite.SQLiteDatabase): Promise<void> {
  // Note: Category validation is done in application code to allow easy addition of new categories
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      key_concepts TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0 CHECK (is_custom IN (0, 1)),
      created_at TEXT NOT NULL,
      source_references TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

    CREATE TABLE IF NOT EXISTS card_schedules (
      question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
      next_review_date TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
      interval INTEGER DEFAULT 0 CHECK (interval >= 0),
      repetitions INTEGER DEFAULT 0 CHECK (repetitions >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_next_review ON card_schedules(next_review_date);

    CREATE TABLE IF NOT EXISTS review_records (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      user_answer TEXT NOT NULL,
      answer_type TEXT DEFAULT 'text' CHECK (answer_type IN ('text', 'audio')),
      score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      ai_feedback TEXT NOT NULL,
      what_covered_well TEXT,
      what_missing TEXT,
      missed_concepts TEXT,
      model_answer TEXT,
      reviewed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_question ON review_records(question_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_date ON review_records(reviewed_at);

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_reviews INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_practice_date TEXT
    );

    CREATE TABLE IF NOT EXISTS concept_gaps (
      concept TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      missed_count INTEGER DEFAULT 1 CHECK (missed_count >= 0),
      last_missed_at TEXT NOT NULL,
      question_ids TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_concept_gaps_count ON concept_gaps(missed_count DESC);

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER DEFAULT 10,
      cards_reviewed INTEGER DEFAULT 0,
      average_score REAL DEFAULT 0,
      was_completed INTEGER DEFAULT 0 CHECK (was_completed IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON practice_sessions(started_at DESC);
  `);

  // Initialize user_stats with default row
  await database.runAsync(`
    INSERT OR IGNORE INTO user_stats (id, total_reviews, current_streak, longest_streak)
    VALUES (1, 0, 0, 0)
  `);

  // Create user_preferences table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      experience_level TEXT CHECK (experience_level IN ('student', 'entry', 'mid', 'senior', 'career-change')),
      current_role TEXT,
      technical_background TEXT,
      preferred_categories TEXT NOT NULL DEFAULT '[]',
      preferred_difficulties TEXT NOT NULL DEFAULT '{}',
      onboarding_completed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS onboarding_conversations (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      messages TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
  `);
}

// Run database migrations
async function runMigrations(
  database: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  // Migration from version 1 to 2: Add user_preferences and onboarding_conversations tables
  if (fromVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        experience_level TEXT CHECK (experience_level IN ('student', 'entry', 'mid', 'senior', 'career-change')),
        current_role TEXT,
        technical_background TEXT,
        preferred_categories TEXT NOT NULL DEFAULT '[]',
        preferred_difficulties TEXT NOT NULL DEFAULT '{}',
        onboarding_completed_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS onboarding_conversations (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        messages TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );
    `);
  }

  // Migration from version 2 to 3: Add source_references column and new categories
  if (fromVersion < 3) {
    // Add source_references column to questions table (if not exists)
    const tableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(questions)"
    );
    const hasSourceReferences = tableInfo.some(col => col.name === 'source_references');
    if (!hasSourceReferences) {
      await database.execAsync(`
        ALTER TABLE questions ADD COLUMN source_references TEXT;
      `);
    }

    // Note: SQLite doesn't support modifying CHECK constraints directly.
    // The new categories will work because SQLite CHECK constraints are
    // not enforced on existing data, and new inserts will validate.
    // For a production app, you'd recreate the table.

    // Seed new questions for the new categories
    await seedNewCategoryQuestions(database);
  }

  // Migration to version 5: Remove category CHECK constraint and add technical definitions
  if (fromVersion < 5) {
    // Recreate questions table without category CHECK constraint
    // This allows adding new categories without schema changes
    await database.execAsync(`
      -- Create new table without CHECK constraint on category
      CREATE TABLE IF NOT EXISTS questions_new (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        key_concepts TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0 CHECK (is_custom IN (0, 1)),
        created_at TEXT NOT NULL,
        source_references TEXT
      );

      -- Copy existing data
      INSERT INTO questions_new SELECT * FROM questions;

      -- Drop old table and rename new one
      DROP TABLE questions;
      ALTER TABLE questions_new RENAME TO questions;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
      CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    `);

    await seedTechnicalDefinitions(database);
  }

  await database.runAsync(
    'UPDATE schema_version SET version = ?',
    CURRENT_SCHEMA_VERSION
  );
}

// Seed initial questions
async function seedQuestions(database: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  // Seed original questions
  for (const q of SEED_QUESTIONS) {
    const id = Crypto.randomUUID();
    await database.runAsync(
      `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      q.prompt,
      q.category,
      q.difficulty,
      JSON.stringify(q.keyConcepts),
      now,
      null
    );

    // Create initial schedule (due immediately)
    await database.runAsync(
      `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
       VALUES (?, ?, 2.5, 0, 0)`,
      id,
      now
    );
  }

  // Seed technically.dev questions
  for (const q of TECHNICALLY_DEV_QUESTIONS) {
    const id = Crypto.randomUUID();
    await database.runAsync(
      `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      q.prompt,
      q.category,
      q.difficulty,
      JSON.stringify(q.keyConcepts),
      now,
      q.sourceReferences ? JSON.stringify(q.sourceReferences) : null
    );

    // Create initial schedule (due immediately)
    await database.runAsync(
      `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
       VALUES (?, ?, 2.5, 0, 0)`,
      id,
      now
    );
  }

  // Seed technical definitions
  for (const q of TECHNICAL_DEFINITIONS) {
    const id = Crypto.randomUUID();
    await database.runAsync(
      `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      q.prompt,
      q.category,
      q.difficulty,
      JSON.stringify(q.keyConcepts),
      now,
      q.sourceReferences ? JSON.stringify(q.sourceReferences) : null
    );

    await database.runAsync(
      `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
       VALUES (?, ?, 2.5, 0, 0)`,
      id,
      now
    );
  }
}

// Seed new category questions for migration
async function seedNewCategoryQuestions(database: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  for (const q of TECHNICALLY_DEV_QUESTIONS) {
    const id = Crypto.randomUUID();
    await database.runAsync(
      `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      q.prompt,
      q.category,
      q.difficulty,
      JSON.stringify(q.keyConcepts),
      now,
      q.sourceReferences ? JSON.stringify(q.sourceReferences) : null
    );

    // Create initial schedule (due immediately)
    await database.runAsync(
      `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
       VALUES (?, ?, 2.5, 0, 0)`,
      id,
      now
    );
  }
}

// Seed technical definitions for migration
async function seedTechnicalDefinitions(database: SQLite.SQLiteDatabase): Promise<void> {
  // Check if technical definitions already exist (check for fundamentals or devops category)
  const existing = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM questions WHERE category IN ('fundamentals', 'devops')"
  );
  if (existing && existing.count > 0) {
    logger.debug('Technical definitions already seeded, skipping...');
    return;
  }

  const now = new Date().toISOString();

  for (const q of TECHNICAL_DEFINITIONS) {
    const id = Crypto.randomUUID();
    await database.runAsync(
      `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      q.prompt,
      q.category,
      q.difficulty,
      JSON.stringify(q.keyConcepts),
      now,
      q.sourceReferences ? JSON.stringify(q.sourceReferences) : null
    );

    await database.runAsync(
      `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
       VALUES (?, ?, 2.5, 0, 0)`,
      id,
      now
    );
  }
}

// ============ Question Operations ============

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM questions ORDER BY created_at DESC');
  return rows.map(mapRowToQuestion);
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM questions WHERE id = ?', id);
  return row ? mapRowToQuestion(row) : null;
}

export async function getQuestionsByCategory(category: Category): Promise<Question[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM questions WHERE category = ? ORDER BY difficulty, created_at',
    category
  );
  return rows.map(mapRowToQuestion);
}

export async function addQuestion(
  question: Omit<Question, 'id' | 'createdAt'>
): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO questions (id, prompt, category, difficulty, key_concepts, is_custom, created_at, source_references)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    question.prompt,
    question.category,
    question.difficulty,
    JSON.stringify(question.keyConcepts),
    question.isCustom ? 1 : 0,
    now,
    question.sourceReferences ? JSON.stringify(question.sourceReferences) : null
  );

  // Create initial schedule
  await db.runAsync(
    `INSERT INTO card_schedules (question_id, next_review_date, ease_factor, interval, repetitions)
     VALUES (?, ?, 2.5, 0, 0)`,
    id,
    now
  );

  return id;
}

export async function deleteQuestion(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM questions WHERE id = ?', id);
}

export async function getQuestionCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM questions'
  );
  return result?.count ?? 0;
}

// ============ Card Schedule Operations ============

export async function getCardSchedule(questionId: string): Promise<CardSchedule | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM card_schedules WHERE question_id = ?',
    questionId
  );
  return row ? mapRowToCardSchedule(row) : null;
}

export async function updateCardSchedule(schedule: CardSchedule): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE card_schedules
     SET next_review_date = ?, ease_factor = ?, interval = ?, repetitions = ?
     WHERE question_id = ?`,
    schedule.nextReviewDate,
    schedule.easeFactor,
    schedule.interval,
    schedule.repetitions,
    schedule.questionId
  );
}

export async function getDueCards(beforeDate?: string): Promise<CardSchedule[]> {
  const db = await getDatabase();
  const date = beforeDate ?? new Date().toISOString();
  const rows = await db.getAllAsync<any>(
    `SELECT cs.* FROM card_schedules cs
     JOIN questions q ON cs.question_id = q.id
     WHERE cs.next_review_date <= ?
     ORDER BY cs.next_review_date ASC`,
    date
  );
  return rows.map(mapRowToCardSchedule);
}

export async function getDueCardCount(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM card_schedules WHERE next_review_date <= ?',
    now
  );
  return result?.count ?? 0;
}

// ============ Review Record Operations ============

export async function addReviewRecord(
  record: Omit<ReviewRecord, 'id'>
): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO review_records
     (id, question_id, user_answer, answer_type, score, ai_feedback, what_covered_well, what_missing, missed_concepts, model_answer, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    record.questionId,
    record.userAnswer,
    record.answerType,
    record.score,
    record.aiFeedback,
    record.whatWasCoveredWell,
    record.whatWasMissing,
    JSON.stringify(record.missedConcepts),
    record.modelAnswer,
    record.reviewedAt
  );

  // Update user stats
  await incrementTotalReviews();

  return id;
}

export async function getReviewHistory(limit: number = 20): Promise<ReviewRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM review_records ORDER BY reviewed_at DESC LIMIT ?',
    limit
  );
  return rows.map(mapRowToReviewRecord);
}

export async function getReviewsForQuestion(questionId: string): Promise<ReviewRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM review_records WHERE question_id = ? ORDER BY reviewed_at DESC',
    questionId
  );
  return rows.map(mapRowToReviewRecord);
}

// ============ User Stats Operations ============

export async function getUserStats(): Promise<UserStats> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_stats WHERE id = 1');
  return {
    totalReviews: row?.total_reviews ?? 0,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastPracticeDate: row?.last_practice_date ?? null,
  };
}

async function incrementTotalReviews(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE user_stats SET total_reviews = total_reviews + 1 WHERE id = 1');
}

export async function updateStreak(): Promise<void> {
  const db = await getDatabase();
  const stats = await getUserStats();
  const today = new Date().toISOString().split('T')[0];
  const lastDate = stats.lastPracticeDate?.split('T')[0];

  if (lastDate === today) {
    // Already practiced today, no change
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  if (lastDate === yesterdayStr) {
    // Practiced yesterday, increment streak
    newStreak = stats.currentStreak + 1;
  } else {
    // Missed a day, reset streak
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, stats.longestStreak);

  await db.runAsync(
    `UPDATE user_stats
     SET current_streak = ?, longest_streak = ?, last_practice_date = ?
     WHERE id = 1`,
    newStreak,
    newLongest,
    new Date().toISOString()
  );
}

// ============ Concept Gap Operations ============

export async function updateConceptGaps(
  missedConcepts: string[],
  questionId: string,
  category: Category
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  for (const concept of missedConcepts) {
    const existing = await db.getFirstAsync<any>(
      'SELECT * FROM concept_gaps WHERE concept = ?',
      concept
    );

    if (existing) {
      // Update existing
      const questionIds = JSON.parse(existing.question_ids);
      if (!questionIds.includes(questionId)) {
        questionIds.push(questionId);
      }
      await db.runAsync(
        `UPDATE concept_gaps
         SET missed_count = missed_count + 1, last_missed_at = ?, question_ids = ?
         WHERE concept = ?`,
        now,
        JSON.stringify(questionIds),
        concept
      );
    } else {
      // Insert new
      await db.runAsync(
        `INSERT INTO concept_gaps (concept, category, missed_count, last_missed_at, question_ids)
         VALUES (?, ?, 1, ?, ?)`,
        concept,
        category,
        now,
        JSON.stringify([questionId])
      );
    }
  }
}

export async function getTopConceptGaps(limit: number = 10): Promise<ConceptGap[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM concept_gaps ORDER BY missed_count DESC LIMIT ?',
    limit
  );
  return rows.map((row) => ({
    concept: row.concept,
    category: row.category as Category,
    missedCount: row.missed_count,
    lastMissedAt: row.last_missed_at,
    questionIds: JSON.parse(row.question_ids),
  }));
}

// ============ Practice Session Operations ============

export async function startPracticeSession(durationMinutes: number = 10): Promise<string> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO practice_sessions (id, started_at, duration_minutes, cards_reviewed, average_score, was_completed)
     VALUES (?, ?, ?, 0, 0, 0)`,
    id,
    now,
    durationMinutes
  );

  return id;
}

export async function endPracticeSession(
  sessionId: string,
  cardsReviewed: number,
  averageScore: number,
  wasCompleted: boolean = true
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE practice_sessions
     SET ended_at = ?, cards_reviewed = ?, average_score = ?, was_completed = ?
     WHERE id = ?`,
    now,
    cardsReviewed,
    averageScore,
    wasCompleted ? 1 : 0,
    sessionId
  );

  // Update streak on session end
  await updateStreak();
}

export async function getRecentSessions(limit: number = 10): Promise<PracticeSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM practice_sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
    limit
  );
  return rows.map(mapRowToPracticeSession);
}

// ============ Stats Aggregation ============

export async function getCategoryStats(): Promise<CategoryStats[]> {
  const db = await getDatabase();

  const categories: Category[] = ALL_CATEGORIES;

  const stats: CategoryStats[] = [];

  for (const category of categories) {
    // Total questions in category
    const totalResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions WHERE category = ?',
      category
    );
    const totalQuestions = totalResult?.count ?? 0;

    // Questions with at least one review
    const reviewedResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT r.question_id) as count
       FROM review_records r
       JOIN questions q ON r.question_id = q.id
       WHERE q.category = ?`,
      category
    );
    const reviewedCount = reviewedResult?.count ?? 0;

    // Average score for category
    const avgResult = await db.getFirstAsync<{ avg: number }>(
      `SELECT AVG(r.score) as avg
       FROM review_records r
       JOIN questions q ON r.question_id = q.id
       WHERE q.category = ?`,
      category
    );
    const averageScore = avgResult?.avg ?? 0;

    // Mastered cards (interval > 7)
    const masteredResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM card_schedules cs
       JOIN questions q ON cs.question_id = q.id
       WHERE q.category = ? AND cs.interval > 7`,
      category
    );
    const masteredCount = masteredResult?.count ?? 0;

    stats.push({
      category,
      totalQuestions,
      reviewedCount,
      averageScore: Math.round(averageScore * 10) / 10,
      masteredCount,
    });
  }

  return stats;
}

export async function getWeeklyReviewCount(): Promise<number> {
  const db = await getDatabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM review_records WHERE reviewed_at >= ?',
    weekAgo.toISOString()
  );
  return result?.count ?? 0;
}

export async function getAverageScoreThisWeek(): Promise<number> {
  const db = await getDatabase();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const result = await db.getFirstAsync<{ avg: number }>(
    'SELECT AVG(score) as avg FROM review_records WHERE reviewed_at >= ?',
    weekAgo.toISOString()
  );
  return result?.avg ? Math.round(result.avg * 10) / 10 : 0;
}

// ============ User Preferences Operations ============

const DEFAULT_DIFFICULTIES: Record<Category, Difficulty> = {
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
};

const ALL_CATEGORIES: Category[] = [
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

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_preferences WHERE id = 1');

  if (!row) {
    return null;
  }

  return {
    experienceLevel: row.experience_level,
    currentRole: row.current_role,
    technicalBackground: row.technical_background,
    preferredCategories: JSON.parse(row.preferred_categories || '[]'),
    preferredDifficulties: JSON.parse(row.preferred_difficulties || '{}'),
    onboardingCompletedAt: row.onboarding_completed_at,
    updatedAt: row.updated_at,
  };
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO user_preferences (id, experience_level, current_role, technical_background, preferred_categories, preferred_difficulties, onboarding_completed_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       experience_level = excluded.experience_level,
       current_role = excluded.current_role,
       technical_background = excluded.technical_background,
       preferred_categories = excluded.preferred_categories,
       preferred_difficulties = excluded.preferred_difficulties,
       onboarding_completed_at = excluded.onboarding_completed_at,
       updated_at = excluded.updated_at`,
    preferences.experienceLevel,
    preferences.currentRole,
    preferences.technicalBackground,
    JSON.stringify(preferences.preferredCategories),
    JSON.stringify(preferences.preferredDifficulties),
    preferences.onboardingCompletedAt,
    now
  );
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const prefs = await getUserPreferences();
  return prefs?.onboardingCompletedAt !== null && prefs?.onboardingCompletedAt !== undefined;
}

export async function clearOnboardingCompletion(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE user_preferences SET onboarding_completed_at = NULL, updated_at = ? WHERE id = 1',
    new Date().toISOString()
  );
}

export function getDefaultPreferences(): UserPreferences {
  return {
    experienceLevel: null,
    currentRole: null,
    technicalBackground: null,
    preferredCategories: ALL_CATEGORIES,
    preferredDifficulties: DEFAULT_DIFFICULTIES,
    onboardingCompletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============ Onboarding Conversation Operations ============

export async function getOnboardingConversation(): Promise<OnboardingMessage[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT messages FROM onboarding_conversations WHERE id = 1');

  if (!row) {
    return [];
  }

  return JSON.parse(row.messages || '[]');
}

export async function saveOnboardingConversation(messages: OnboardingMessage[]): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO onboarding_conversations (id, messages, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       messages = excluded.messages,
       updated_at = excluded.updated_at`,
    JSON.stringify(messages),
    now
  );
}

export async function clearOnboardingConversation(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM onboarding_conversations WHERE id = 1');
}

// ============ Prioritized Card Selection ============

export async function getDueCardsWithPriority(
  preferences: UserPreferences
): Promise<CardSchedule[]> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Get all due cards with their category
  const rows = await db.getAllAsync<any>(
    `SELECT cs.*, q.category FROM card_schedules cs
     JOIN questions q ON cs.question_id = q.id
     WHERE cs.next_review_date <= ?
     ORDER BY cs.next_review_date ASC`,
    now
  );

  const dueCards = rows.map((row) => ({
    schedule: mapRowToCardSchedule(row),
    category: row.category as Category,
  }));

  // Sort: preferred categories first (by priority order), then by next_review_date
  const preferredSet = new Set(preferences.preferredCategories);
  const priorityMap = new Map(
    preferences.preferredCategories.map((cat, idx) => [cat, idx])
  );

  dueCards.sort((a, b) => {
    const aPreferred = preferredSet.has(a.category);
    const bPreferred = preferredSet.has(b.category);

    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;

    if (aPreferred && bPreferred) {
      const aPriority = priorityMap.get(a.category) ?? Infinity;
      const bPriority = priorityMap.get(b.category) ?? Infinity;
      if (aPriority !== bPriority) return aPriority - bPriority;
    }

    // Fall back to next_review_date
    return a.schedule.nextReviewDate.localeCompare(b.schedule.nextReviewDate);
  });

  return dueCards.map((item) => item.schedule);
}

// ============ Reset Operations ============

export async function resetAllProgress(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Clear review records
  await db.runAsync('DELETE FROM review_records');

  // Clear concept gaps
  await db.runAsync('DELETE FROM concept_gaps');

  // Clear practice sessions
  await db.runAsync('DELETE FROM practice_sessions');

  // Reset user stats
  await db.runAsync(
    'UPDATE user_stats SET total_reviews = 0, current_streak = 0, last_practice_date = NULL WHERE id = 1'
  );

  // Reset all card schedules to due now
  await db.runAsync(
    'UPDATE card_schedules SET next_review_date = ?, ease_factor = 2.5, interval = 0, repetitions = 0',
    now
  );

  // Clear onboarding conversation (but keep preferences)
  await db.runAsync('DELETE FROM onboarding_conversations');
}

export async function deleteCustomQuestions(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM questions WHERE is_custom = 1');
}

// ============ Row Mappers ============

function mapRowToQuestion(row: any): Question {
  return {
    id: row.id,
    prompt: row.prompt,
    category: row.category as Category,
    difficulty: row.difficulty,
    keyConcepts: JSON.parse(row.key_concepts),
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
    sourceReferences: row.source_references ? JSON.parse(row.source_references) : undefined,
  };
}

function mapRowToCardSchedule(row: any): CardSchedule {
  return {
    questionId: row.question_id,
    nextReviewDate: row.next_review_date,
    easeFactor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
  };
}

function mapRowToReviewRecord(row: any): ReviewRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    userAnswer: row.user_answer,
    answerType: row.answer_type,
    score: row.score,
    aiFeedback: row.ai_feedback,
    whatWasCoveredWell: row.what_covered_well,
    whatWasMissing: row.what_missing,
    missedConcepts: row.missed_concepts ? JSON.parse(row.missed_concepts) : [],
    modelAnswer: row.model_answer,
    reviewedAt: row.reviewed_at,
  };
}

function mapRowToPracticeSession(row: any): PracticeSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    cardsReviewed: row.cards_reviewed,
    averageScore: row.average_score,
    wasCompleted: row.was_completed === 1,
  };
}

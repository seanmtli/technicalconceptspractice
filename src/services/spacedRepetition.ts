import { addDays } from 'date-fns';
import { CardSchedule } from '../types';

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Calculates the next review date based on the user's score.
 *
 * Scoring Guide:
 * - 1-2: Struggling - reset to review tomorrow
 * - 3: Adequate - short interval
 * - 4-5: Good/Excellent - increasing intervals
 */

export function calculateNextReview(
  score: number,
  currentSchedule: CardSchedule
): CardSchedule {
  let { easeFactor, interval, repetitions } = currentSchedule;

  // Score 1-2: Reset (struggling with this card)
  if (score < 3) {
    repetitions = 0;
    interval = 1; // Review tomorrow
  } else {
    // Score 3+: Increase interval
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1; // First successful review: 1 day
    } else if (repetitions === 2) {
      interval = 3; // Second: 3 days
    } else {
      // Subsequent: multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }

    // Adjust ease factor based on score
    // Formula from SM-2: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    easeFactor = Math.max(
      1.3, // Minimum ease factor
      easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
    );
  }

  // Cap maximum interval at 365 days
  interval = Math.min(interval, 365);

  const nextReviewDate = addDays(new Date(), interval).toISOString();

  return {
    questionId: currentSchedule.questionId,
    nextReviewDate,
    easeFactor,
    interval,
    repetitions,
  };
}

/**
 * Create initial schedule for a new card
 */
export function createInitialSchedule(questionId: string): CardSchedule {
  return {
    questionId,
    nextReviewDate: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  };
}

/**
 * Get human-readable next review text
 */
export function getNextReviewText(schedule: CardSchedule): string {
  const now = new Date();
  const nextReview = new Date(schedule.nextReviewDate);
  const diffDays = Math.ceil(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) {
    return 'Due now';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.round(diffDays / 30);
    return `Due in ${months} month${months > 1 ? 's' : ''}`;
  }
}

/**
 * Check if a card is considered "mastered" (interval > 7 days)
 */
export function isMastered(schedule: CardSchedule): boolean {
  return schedule.interval > 7;
}

/**
 * Get mastery level as a string
 */
export function getMasteryLevel(schedule: CardSchedule): string {
  if (schedule.repetitions === 0) {
    return 'New';
  } else if (schedule.interval <= 1) {
    return 'Learning';
  } else if (schedule.interval <= 7) {
    return 'Reviewing';
  } else if (schedule.interval <= 30) {
    return 'Familiar';
  } else {
    return 'Mastered';
  }
}

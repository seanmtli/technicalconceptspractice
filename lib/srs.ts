import { CardSchedule } from './types';

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Scoring Guide:
 * - 1-2: Struggling - reset to review tomorrow
 * - 3: Adequate - short interval
 * - 4-5: Good/Excellent - increasing intervals
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateNextReview(
  score: number,
  currentSchedule: CardSchedule,
  now: Date = new Date()
): CardSchedule {
  let { easeFactor, interval, repetitions } = currentSchedule;

  if (score < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // SM-2: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), floored at 1.3
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
    );
  }

  interval = Math.min(interval, 365);

  return {
    questionId: currentSchedule.questionId,
    nextReviewDate: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    easeFactor,
    interval,
    repetitions,
  };
}

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

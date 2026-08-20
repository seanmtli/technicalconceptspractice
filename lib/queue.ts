import { Question, QuestionMode } from './types';

export type SessionMode = QuestionMode | 'mixed';

/** A queue slot: a concrete card, or an instruction to generate a contextual one. */
export type QueueSlot = { kind: 'card'; question: Question } | { kind: 'generate' };

export interface ScheduleRow {
  question_id: string;
  next_review_date: string;
}

export const SESSION_CAP = 10;
const DRILLS_PER_CONTEXTUAL = 4;

/**
 * Lazy per-user scheduling: a question with no schedule row is due now.
 * Returns questions due at `now`, most-overdue first (never-seen sorts as due now).
 */
export function dueQuestions(
  questions: Question[],
  schedules: ScheduleRow[],
  now: Date = new Date()
): Question[] {
  const byId = new Map(schedules.map((s) => [s.question_id, s.next_review_date]));
  return questions
    .filter((q) => {
      const due = byId.get(q.id);
      return due === undefined || new Date(due) <= now;
    })
    .sort((a, b) => {
      const da = byId.get(a.id) ?? now.toISOString();
      const db = byId.get(b.id) ?? now.toISOString();
      return da.localeCompare(db);
    });
}

/**
 * Build the session queue.
 * - drill / contextual: due cards of that mode, capped.
 * - mixed: after every 4 drill cards, one contextual slot — a due contextual bank
 *   card if available, else a generate slot (only when the user has concept gaps).
 */
export function buildQueue(
  due: Question[],
  mode: SessionMode,
  hasConceptGaps: boolean,
  cap: number = SESSION_CAP
): QueueSlot[] {
  if (mode !== 'mixed') {
    return due
      .filter((q) => q.mode === mode)
      .slice(0, cap)
      .map((question) => ({ kind: 'card' as const, question }));
  }

  const drills = due.filter((q) => q.mode === 'drill');
  const contextuals = due.filter((q) => q.mode === 'contextual');
  const slots: QueueSlot[] = [];
  let d = 0;
  let c = 0;

  while (slots.length < cap && (d < drills.length || c < contextuals.length)) {
    for (let i = 0; i < DRILLS_PER_CONTEXTUAL && d < drills.length && slots.length < cap; i++) {
      slots.push({ kind: 'card', question: drills[d++] });
    }
    if (slots.length >= cap) break;
    if (c < contextuals.length) {
      slots.push({ kind: 'card', question: contextuals[c++] });
    } else if (hasConceptGaps && d > 0) {
      slots.push({ kind: 'generate' });
    } else if (d >= drills.length) {
      break;
    }
  }
  return slots;
}

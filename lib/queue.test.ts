import { describe, expect, it } from 'vitest';
import { buildQueue, dueQuestions, QueueSlot } from './queue';
import { Question } from './types';

let n = 0;
function q(mode: 'drill' | 'contextual'): Question {
  n++;
  return {
    id: `q${n}`,
    prompt: `question ${n}`,
    category: 'fundamentals',
    difficulty: 'beginner',
    mode,
    keyConcepts: [],
    sourceIds: [],
    isCustom: false,
    createdAt: new Date().toISOString(),
  };
}

const kinds = (slots: QueueSlot[]) =>
  slots.map((s) => (s.kind === 'generate' ? 'G' : s.question.mode === 'drill' ? 'D' : 'C')).join('');

describe('dueQuestions', () => {
  it('treats unscheduled questions as due and overdue-first ordering', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const a = q('drill');
    const b = q('drill');
    const c = q('drill');
    const due = dueQuestions(
      [a, b, c],
      [
        { question_id: a.id, next_review_date: '2026-08-25T00:00:00Z' }, // future: not due
        { question_id: b.id, next_review_date: '2026-08-01T00:00:00Z' }, // overdue
      ],
      now
    );
    expect(due.map((x) => x.id)).toEqual([b.id, c.id]);
  });
});

describe('buildQueue', () => {
  it('single-mode queues filter and cap', () => {
    const due = [q('drill'), q('contextual'), q('drill'), q('drill')];
    expect(kinds(buildQueue(due, 'drill', false, 2))).toBe('DD');
    expect(kinds(buildQueue(due, 'contextual', false))).toBe('C');
  });

  it('mixed interleaves a contextual slot after every 4 drills', () => {
    const due = [
      ...Array.from({ length: 8 }, () => q('drill')),
      q('contextual'),
      q('contextual'),
    ];
    expect(kinds(buildQueue(due, 'mixed', false))).toBe('DDDDCDDDDC');
  });

  it('mixed falls back to generate slots when no contextual bank cards but gaps exist', () => {
    const due = Array.from({ length: 8 }, () => q('drill'));
    expect(kinds(buildQueue(due, 'mixed', true))).toBe('DDDDGDDDDG');
  });

  it('mixed stays drill-only with no gaps and no bank cards', () => {
    const due = Array.from({ length: 6 }, () => q('drill'));
    expect(kinds(buildQueue(due, 'mixed', false))).toBe('DDDDDD');
  });

  it('respects the session cap', () => {
    const due = Array.from({ length: 30 }, () => q('drill'));
    expect(buildQueue(due, 'mixed', true).length).toBe(10);
  });
});

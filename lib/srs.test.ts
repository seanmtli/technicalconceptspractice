import { describe, expect, it } from 'vitest';
import { calculateNextReview } from './srs';
import { CardSchedule } from './types';

const base: CardSchedule = {
  questionId: 'q1',
  nextReviewDate: new Date().toISOString(),
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
};

describe('calculateNextReview', () => {
  it('resets on failing score without touching ease', () => {
    const s = calculateNextReview(2, { ...base, easeFactor: 2.0, interval: 30, repetitions: 5 });
    expect(s.repetitions).toBe(0);
    expect(s.interval).toBe(1);
    expect(s.easeFactor).toBe(2.0);
  });

  it('progresses 1 -> 3 -> round(interval * EF)', () => {
    let s = calculateNextReview(4, base);
    expect(s.interval).toBe(1);
    expect(s.repetitions).toBe(1);
    s = calculateNextReview(4, s);
    expect(s.interval).toBe(3);
    s = calculateNextReview(4, s);
    expect(s.interval).toBe(Math.round(3 * s.easeFactor));
  });

  it('raises ease by 0.1 on a perfect score', () => {
    const s = calculateNextReview(5, base);
    expect(s.easeFactor).toBeCloseTo(2.6);
  });

  it('floors ease factor at 1.3', () => {
    let s = { ...base, easeFactor: 1.3 };
    for (let i = 0; i < 5; i++) s = calculateNextReview(3, s);
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('caps interval at 365 days', () => {
    const s = calculateNextReview(5, { ...base, easeFactor: 2.5, interval: 300, repetitions: 9 });
    expect(s.interval).toBe(365);
  });

  it('schedules the next review interval days out', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const s = calculateNextReview(4, base, now);
    expect(s.nextReviewDate).toBe(new Date('2026-08-21T12:00:00Z').toISOString());
  });
});

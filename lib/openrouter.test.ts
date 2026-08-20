import { describe, expect, it } from 'vitest';
import { parseJsonResponse, validateEvaluation, ApiError } from './openrouter';

describe('parseJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJsonResponse<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(parseJsonResponse<{ a: number }>('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseJsonResponse<{ a: number }>('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('throws a retryable ApiError on garbage', () => {
    expect(() => parseJsonResponse('not json')).toThrowError(ApiError);
    try {
      parseJsonResponse('not json');
    } catch (e) {
      expect((e as ApiError).retryable).toBe(true);
    }
  });
});

describe('validateEvaluation', () => {
  const good = {
    score: 4,
    whatWasCoveredWell: 'a',
    whatWasMissing: 'b',
    missedConcepts: ['x'],
    modelAnswer: 'c',
    fullFeedback: 'd',
    goDeeper: [{ title: 't', url: 'https://example.com' }],
  };

  it('passes a well-formed evaluation through', () => {
    expect(validateEvaluation(good)).toEqual(good);
  });

  it('coerces a stringy score and rounds it', () => {
    expect(validateEvaluation({ ...good, score: '3.6' }).score).toBe(4);
  });

  it('rejects out-of-range scores', () => {
    expect(() => validateEvaluation({ ...good, score: 0 })).toThrowError(ApiError);
    expect(() => validateEvaluation({ ...good, score: 'nope' })).toThrowError(ApiError);
  });

  it('coerces missing/malformed arrays and drops non-https links', () => {
    const v = validateEvaluation({
      score: 5,
      missedConcepts: 'oops',
      goDeeper: [{ title: 't', url: 'http://x.com' }, { title: 1, url: 'https://y.com' }, 'junk'],
    });
    expect(v.missedConcepts).toEqual([]);
    expect(v.goDeeper).toEqual([]);
    expect(v.whatWasCoveredWell).toBe('');
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatJson, validateEvaluation, ApiError, EVAL_MODEL } from '@/lib/openrouter';
import { DRILL_EVALUATION_PROMPT, CONTEXTUAL_EVALUATION_PROMPT, fillPrompt } from '@/lib/prompts';
import { calculateNextReview } from '@/lib/srs';
import { CardSchedule, EvaluationResult } from '@/lib/types';

const bodySchema = z.object({
  questionId: z.string().uuid().nullable(),
  questionPrompt: z.string().min(1).max(2000),
  mode: z.enum(['drill', 'contextual']),
  category: z.string().min(1).max(50),
  keyConcepts: z.array(z.string().max(200)).max(20),
  answerText: z.string().min(1).max(8000),
  answerType: z.enum(['audio', 'text']),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'BAD_REQUEST', detail: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  // For bank questions, the server's copy of the rubric/category wins over the client's.
  let keyConcepts = body.keyConcepts;
  let category = body.category;
  let questionPrompt = body.questionPrompt;
  let sourceIds: string[] = [];
  if (body.questionId) {
    const { data: q } = await supabase
      .from('questions')
      .select('prompt, category, key_concepts, source_ids')
      .eq('id', body.questionId)
      .single();
    if (!q) return NextResponse.json({ error: 'QUESTION_NOT_FOUND' }, { status: 404 });
    keyConcepts = q.key_concepts;
    category = q.category;
    questionPrompt = q.prompt;
    sourceIds = q.source_ids;
  }

  // Grounding articles: linked ones for bank questions, concept-overlap for ephemeral.
  let sourcesBlock = '(none)';
  const sourceQuery = supabase.from('sources').select('title, url, summary');
  const { data: sources } = body.questionId
    ? sourceIds.length > 0
      ? await sourceQuery.in('id', sourceIds)
      : { data: [] }
    : await sourceQuery.overlaps('concepts', keyConcepts.map((c) => c.toLowerCase())).limit(3);
  if (sources && sources.length > 0) {
    sourcesBlock = sources
      .map((s) => `- "${s.title}" (${s.url}): ${s.summary}`)
      .join('\n');
  }

  const template = body.mode === 'drill' ? DRILL_EVALUATION_PROMPT : CONTEXTUAL_EVALUATION_PROMPT;
  const prompt = fillPrompt(template, {
    question: questionPrompt,
    keyConcepts: keyConcepts.join(', '),
    userAnswer: body.answerText,
    sources: sourcesBlock,
  });

  let evaluation;
  try {
    evaluation = validateEvaluation(await chatJson(prompt, { model: EVAL_MODEL, maxTokens: 2048 }));
  } catch (e) {
    console.error('evaluation failed:', e);
    const code = e instanceof ApiError ? e.code : 'UNKNOWN';
    const retryable = e instanceof ApiError ? e.retryable : true;
    return NextResponse.json({ error: code, retryable }, { status: 502 });
  }

  // SM-2 reschedule (bank questions only) + atomic writeback.
  let nextSchedule: CardSchedule | null = null;
  if (body.questionId) {
    const { data: sched } = await supabase
      .from('card_schedules')
      .select('next_review_date, ease_factor, interval_days, repetitions')
      .eq('question_id', body.questionId)
      .eq('user_id', user.id)
      .maybeSingle();
    const current: CardSchedule = {
      questionId: body.questionId,
      nextReviewDate: sched?.next_review_date ?? new Date().toISOString(),
      easeFactor: sched?.ease_factor ?? 2.5,
      interval: sched?.interval_days ?? 0,
      repetitions: sched?.repetitions ?? 0,
    };
    nextSchedule = calculateNextReview(evaluation.score, current);
  }

  const { data: streak, error: rpcError } = await supabase.rpc('record_review', {
    // generated RPC types don't model nullable args; null is valid here (ephemeral questions)
    p_question_id: body.questionId as unknown as string,
    p_question_prompt: questionPrompt,
    p_mode: body.mode,
    p_category: category,
    p_answer_text: body.answerText,
    p_answer_type: body.answerType,
    p_score: evaluation.score,
    p_feedback: {
      fullFeedback: evaluation.fullFeedback,
      whatWasCoveredWell: evaluation.whatWasCoveredWell,
      whatWasMissing: evaluation.whatWasMissing,
      modelAnswer: evaluation.modelAnswer,
      goDeeper: evaluation.goDeeper,
    },
    p_missed_concepts: evaluation.missedConcepts,
    p_next_review: nextSchedule?.nextReviewDate ?? new Date().toISOString(),
    p_ease: nextSchedule?.easeFactor ?? 2.5,
    p_interval_days: nextSchedule?.interval ?? 0,
    p_repetitions: nextSchedule?.repetitions ?? 0,
    p_local_date: body.localDate,
  });

  const persisted = !rpcError;
  if (rpcError) console.error('record_review failed:', rpcError);

  const result: EvaluationResult = {
    ...evaluation,
    streak: streak ?? 0,
    persisted,
  };
  return NextResponse.json(result);
}

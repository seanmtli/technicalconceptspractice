import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatJson, ApiError, CHEAP_MODEL } from '@/lib/openrouter';
import { CONTEXTUAL_GENERATION_PROMPT, fillPrompt } from '@/lib/prompts';
import { CATEGORIES } from '@/lib/categories';
import { Category, Question } from '@/lib/types';

const bodySchema = z.object({
  recentConcepts: z.array(z.string().max(200)).max(20).default([]),
});

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.id));

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const { data: gaps } = await supabase
    .from('concept_gaps')
    .select('concept, missed_count')
    .order('missed_count', { ascending: false })
    .limit(5);

  const weakConcepts = (gaps ?? []).map((g) => `${g.concept} (missed ${g.missed_count}x)`);
  if (weakConcepts.length === 0 && parsed.data.recentConcepts.length === 0) {
    return NextResponse.json({ error: 'NO_CONCEPTS' }, { status: 409 });
  }

  const prompt = fillPrompt(CONTEXTUAL_GENERATION_PROMPT, {
    weakConcepts: weakConcepts.join('\n') || '(none yet)',
    recentConcepts: parsed.data.recentConcepts.join(', ') || '(none)',
    categories: CATEGORIES.map((c) => c.id).join(', '),
  });

  try {
    const generated = await chatJson<{ prompt: string; keyConcepts: string[]; category: string }>(
      prompt,
      { model: CHEAP_MODEL, maxTokens: 512 }
    );
    if (typeof generated.prompt !== 'string' || generated.prompt.length < 10) {
      throw new ApiError('Generated question missing prompt', 'INVALID_RESPONSE', true);
    }
    const question: Question = {
      id: crypto.randomUUID(), // client-side handle only; never persisted to questions
      prompt: generated.prompt,
      category: (VALID_CATEGORIES.has(generated.category) ? generated.category : 'fundamentals') as Category,
      difficulty: 'intermediate',
      mode: 'contextual',
      keyConcepts: Array.isArray(generated.keyConcepts)
        ? generated.keyConcepts.filter((c): c is string => typeof c === 'string').slice(0, 10)
        : [],
      sourceIds: [],
      isCustom: false,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ question });
  } catch (e) {
    console.error('contextual generation failed:', e);
    const code = e instanceof ApiError ? e.code : 'UNKNOWN';
    return NextResponse.json({ error: code }, { status: 502 });
  }
}

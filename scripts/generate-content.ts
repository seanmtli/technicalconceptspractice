/**
 * Generate new bank content from the crawled source library:
 * - drill questions for the system-design and ai-agents categories
 * - ~30 contextual bank questions mixing concepts across categories
 *
 * Two-phase so a human can review before anything lands in the DB:
 *   npm run generate-content            -> writes scripts/data/generated-questions.json
 *   npm run generate-content -- --insert -> inserts the reviewed JSON (idempotent by prompt)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';
import { chatJson, EVAL_MODEL } from '../lib/openrouter';

const OUT_PATH = 'scripts/data/generated-questions.json';

interface GeneratedQuestion {
  prompt: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  mode: 'drill' | 'contextual';
  keyConcepts: string[];
}

const DRILL_BATCH_PROMPT = `You are an expert technical educator writing flashcard questions for a study app where learners EXPLAIN concepts aloud and are graded against the keyConcepts as a rubric.

## Category: {category}
## Grounding articles (write questions answerable by someone who internalized these)
{sources}

Write {count} questions. Requirements:
- Ask the learner to EXPLAIN or reason, never to recite a definition verbatim
- Each answerable in a 1-3 minute spoken explanation
- keyConcepts: 3-6 concrete concepts the answer must cover (these become the grading rubric)
- Spread difficulties: ~1/3 beginner, ~1/3 intermediate, ~1/3 advanced
- Cover distinct topics; no near-duplicates

Respond with ONLY this JSON:
{"questions": [{"prompt": "...", "difficulty": "beginner|intermediate|advanced", "keyConcepts": ["..."]}]}`;

const CONTEXTUAL_BATCH_PROMPT = `You are an expert technical educator writing CONTEXTUAL practice questions for a study app. These questions connect related concepts or apply them to realistic scenarios — graded on reasoning quality, not recall.

## Available categories
{categories}

## Grounding articles
{sources}

Write {count} questions. Two shapes, mix them:
- Relational: "How does X relate to Y?" (e.g. "How does Docker relate to containerization?")
- Applied/scenario: "How would you think about X in situation Y?" (e.g. "How do you think about the ROI of an AI agent?")

Requirements:
- Each connects 2-3 concepts, ideally across topics
- Answerable in a 1-3 minute spoken explanation
- keyConcepts: the concepts in play (grading anchors)
- category: the single best-fitting category id from the list
- Spread difficulties

Respond with ONLY this JSON:
{"questions": [{"prompt": "...", "category": "...", "difficulty": "beginner|intermediate|advanced", "keyConcepts": ["..."]}]}`;

async function generate(supabase: ReturnType<typeof createClient<Database>>) {
  const { data: sources, error } = await supabase
    .from('sources')
    .select('title, summary, concepts, publication');
  if (error) throw error;
  if (!sources || sources.length < 10) {
    throw new Error(`Only ${sources?.length ?? 0} sources crawled — run crawl-sources first`);
  }

  const sourceBlock = (filter: (concepts: string[]) => boolean, cap: number) =>
    sources
      .filter((s) => filter(s.concepts))
      .slice(0, cap)
      .map((s) => `- ${s.title}: ${s.summary}`)
      .join('\n');

  const all: GeneratedQuestion[] = [];

  const drillSpecs = [
    {
      category: 'system-design',
      match: (c: string[]) =>
        c.some((x) => /system|scal|architect|database|cache|load|queue|shard|replic|api design|microservice/.test(x)),
    },
    {
      category: 'ai-agents',
      match: (c: string[]) => c.some((x) => /agent|mcp|llm|rag|prompt|model|ai |tool use|embedding/.test(x)),
    },
  ];
  for (const spec of drillSpecs) {
    const block = sourceBlock(spec.match, 25) || sourceBlock(() => true, 25);
    const { questions } = await chatJson<{ questions: Omit<GeneratedQuestion, 'category' | 'mode'>[] }>(
      DRILL_BATCH_PROMPT.replace('{category}', spec.category)
        .replace('{sources}', block)
        .replace('{count}', '12'),
      { model: EVAL_MODEL, maxTokens: 4096 }
    );
    all.push(
      ...questions.map((q) => ({ ...q, category: spec.category, mode: 'drill' as const }))
    );
    console.log(`${spec.category}: ${questions.length} drill questions`);
  }

  const { questions: contextual } = await chatJson<{ questions: Omit<GeneratedQuestion, 'mode'>[] }>(
    CONTEXTUAL_BATCH_PROMPT.replace(
      '{categories}',
      'statistics, machine-learning, sql, ab-testing, llm-fundamentals, ml-infrastructure, data-platforms, fundamentals, devops, system-design, ai-agents'
    )
      .replace('{sources}', sourceBlock(() => true, 40))
      .replace('{count}', '30'),
    { model: EVAL_MODEL, maxTokens: 8192 }
  );
  all.push(...contextual.map((q) => ({ ...q, mode: 'contextual' as const })));
  console.log(`contextual bank: ${contextual.length} questions`);

  writeFileSync(OUT_PATH, JSON.stringify(all, null, 2) + '\n');
  console.log(`\nWrote ${all.length} questions to ${OUT_PATH} — review, then rerun with --insert`);
}

async function insert(supabase: ReturnType<typeof createClient<Database>>) {
  const generated: GeneratedQuestion[] = JSON.parse(readFileSync(OUT_PATH, 'utf8'));

  const { data: existingRows, error: selErr } = await supabase.from('questions').select('prompt');
  if (selErr) throw selErr;
  const existing = new Set(existingRows.map((r) => r.prompt));

  const { data: sources, error: srcErr } = await supabase.from('sources').select('id, concepts');
  if (srcErr) throw srcErr;

  const rows = generated
    .filter((q) => !existing.has(q.prompt))
    .map((q) => {
      const concepts = new Set(q.keyConcepts.map((c) => c.toLowerCase()));
      const source_ids = (sources ?? [])
        .map((s) => ({ id: s.id, overlap: s.concepts.filter((c) => concepts.has(c)).length }))
        .filter((m) => m.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 3)
        .map((m) => m.id);
      return {
        prompt: q.prompt,
        category: q.category,
        difficulty: q.difficulty,
        mode: q.mode,
        key_concepts: q.keyConcepts,
        source_ids,
      };
    });

  if (rows.length > 0) {
    const { error } = await supabase.from('questions').insert(rows);
    if (error) throw error;
  }
  const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true });
  console.log(`Inserted ${rows.length} questions; bank now has ${count}.`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars missing');
  const supabase = createClient<Database>(url, serviceKey);

  if (process.argv.includes('--insert')) await insert(supabase);
  else await generate(supabase);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed the shared question bank. Idempotent: inserts only questions whose prompt
 * isn't already in the table. Run with: npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';
import { SEED_QUESTIONS } from './data/seedQuestions';
import { TECHNICAL_DEFINITIONS } from './data/technicalDefinitions';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  const supabase = createClient<Database>(url, serviceKey);

  const all = [
    ...SEED_QUESTIONS.map((q) => ({
      prompt: q.prompt,
      category: q.category,
      difficulty: q.difficulty,
      mode: 'drill' as const,
      key_concepts: q.keyConcepts,
    })),
    ...TECHNICAL_DEFINITIONS.map((q) => ({
      prompt: q.prompt,
      category: q.category,
      difficulty: q.difficulty,
      mode: 'drill' as const,
      key_concepts: q.keyConcepts,
    })),
  ];

  const { data: existing, error: selError } = await supabase
    .from('questions')
    .select('prompt');
  if (selError) throw selError;
  const existingPrompts = new Set(existing.map((r) => r.prompt));

  const missing = all.filter((q) => !existingPrompts.has(q.prompt));
  if (missing.length > 0) {
    const { error } = await supabase.from('questions').insert(missing);
    if (error) throw error;
  }

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });
  console.log(`Inserted ${missing.length} new questions; table now has ${count} total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

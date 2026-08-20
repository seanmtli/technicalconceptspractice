import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dueQuestions } from '@/lib/queue';
import { Question } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: questions }, { data: schedules }, { data: stats }] = await Promise.all([
    supabase.from('questions').select('*'),
    supabase.from('card_schedules').select('question_id, next_review_date'),
    supabase.from('user_stats').select('*').maybeSingle(),
  ]);

  const qs: Question[] = (questions ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    category: q.category as Question['category'],
    difficulty: q.difficulty as Question['difficulty'],
    mode: q.mode as Question['mode'],
    keyConcepts: q.key_concepts,
    sourceIds: q.source_ids,
    isCustom: q.is_custom,
    createdAt: q.created_at,
  }));
  const due = dueQuestions(qs, schedules ?? []);
  const dueDrill = due.filter((q) => q.mode === 'drill').length;
  const dueContextual = due.filter((q) => q.mode === 'contextual').length;

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">DataPractice</h1>
        <form action={signOut}>
          <button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <Stat value={dueDrill} label="drills due" />
        <Stat value={dueContextual} label="contextual due" />
        <Stat value={stats?.current_streak ?? 0} label="day streak 🔥" />
      </div>

      <div className="mt-8 space-y-3">
        <StartButton
          href="/practice?mode=mixed"
          title="Mixed session"
          subtitle="Drills with contextual questions woven in — the full workout"
          primary
        />
        <StartButton
          href="/practice?mode=drill"
          title="Concept drilling"
          subtitle="Explain one concept at a time against its rubric"
        />
        <StartButton
          href="/practice?mode=contextual"
          title="Contextual practice"
          subtitle="Connect concepts and reason through scenarios"
        />
      </div>

      {due.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Nothing due — sessions will offer practice-ahead mode.
        </p>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StartButton({
  href,
  title,
  subtitle,
  primary = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg p-4 ${
        primary
          ? 'bg-black text-white'
          : 'border border-gray-200 hover:border-gray-400'
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className={`mt-0.5 text-sm ${primary ? 'text-gray-300' : 'text-gray-500'}`}>{subtitle}</p>
    </Link>
  );
}

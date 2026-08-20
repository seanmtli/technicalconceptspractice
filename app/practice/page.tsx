'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { buildQueue, dueQuestions, QueueSlot, SessionMode } from '@/lib/queue';
import { getCategoryColor, getCategoryLabel } from '@/lib/categories';
import { EvaluationResult, PracticeCard, PracticeState, Question } from '@/lib/types';

const MAX_RECORD_MS = 5 * 60 * 1000;

function localDate(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function scoreColor(score: number): string {
  return score >= 4 ? 'bg-green-600' : score === 3 ? 'bg-yellow-500' : 'bg-red-600';
}

export default function PracticePage() {
  return (
    <Suspense>
      <Practice />
    </Suspense>
  );
}

function Practice() {
  const mode = (useSearchParams().get('mode') ?? 'mixed') as SessionMode;
  const ignoreSchedule = useSearchParams().get('all') === '1';

  const [state, setState] = useState<PracticeState>({ status: 'loading' });
  const [slots, setSlots] = useState<QueueSlot[]>([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [scores, setScores] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionConceptsRef = useRef<string[]>([]);
  const answerTypeRef = useRef<'audio' | 'text'>('text');

  // ---- slot transitions ----
  async function enterSlot(queue: QueueSlot[], index: number) {
    if (index >= queue.length) {
      setState({ status: 'session_complete' });
      return;
    }
    setSlotIndex(index);
    setTyped('');
    const slot = queue[index];
    if (slot.kind === 'card') {
      setState({ status: 'answering', card: { question: slot.question, ephemeral: false } });
      return;
    }
    // generate slot: compose a contextual question from this session's concepts
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentConcepts: sessionConceptsRef.current.slice(-10) }),
      });
      if (!res.ok) throw new Error('generation failed');
      const { question } = await res.json();
      setState({ status: 'answering', card: { question, ephemeral: true } });
    } catch {
      enterSlot(queue, index + 1); // skip the slot; drills continue
    }
  }

  // ---- session setup ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: questions }, { data: schedules }, { data: gaps }] = await Promise.all([
        supabase.from('questions').select('*'),
        supabase.from('card_schedules').select('question_id, next_review_date'),
        supabase.from('concept_gaps').select('concept').limit(1),
      ]);
      if (cancelled) return;
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
      const due = ignoreSchedule ? qs : dueQuestions(qs, schedules ?? []);
      const queue = buildQueue(due, mode, (gaps ?? []).length > 0);
      setSlots(queue);
      if (queue.length === 0) setState({ status: 'no_cards' });
      else enterSlot(queue, 0);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => enterSlot(slots, slotIndex + 1);

  // ---- recording ----
  async function startRecording(card: PracticeCard) {
    setMicError(null);
    setTyped('');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError('Microphone unavailable — type your answer below instead.');
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) =>
      MediaRecorder.isTypeSupported(m)
    );
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      await transcribeBlob(card, blob);
    };
    rec.start();
    setRecordSeconds(0);
    setState({ status: 'recording', card });
  }

  useEffect(() => {
    if (state.status !== 'recording') return;
    const interval = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    const cutoff = setTimeout(() => recorderRef.current?.stop(), MAX_RECORD_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(cutoff);
    };
  }, [state.status]);

  async function transcribeBlob(card: PracticeCard, blob: Blob) {
    setState({ status: 'processing', card, step: 'transcribing' });
    answerTypeRef.current = 'audio';
    const form = new FormData();
    form.append('audio', blob);
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) throw new Error('stt failed');
      const { transcript } = await res.json();
      setState({ status: 'confirming', card, transcript });
    } catch {
      setMicError('Transcription failed — type your answer below instead.');
      setState({ status: 'answering', card });
    }
  }

  // ---- evaluation ----
  async function evaluate(card: PracticeCard, answerText: string) {
    setState({ status: 'processing', card, step: 'evaluating' });
    sessionConceptsRef.current.push(...card.question.keyConcepts);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: card.ephemeral ? null : card.question.id,
          questionPrompt: card.question.prompt,
          mode: card.question.mode,
          category: card.question.category,
          keyConcepts: card.question.keyConcepts,
          answerText,
          answerType: answerTypeRef.current,
          localDate: localDate(),
        }),
      });
      if (!res.ok) {
        const { error, retryable } = await res.json().catch(() => ({ error: 'UNKNOWN' }));
        setState({ status: 'error', error: `Evaluation failed (${error}).`, retryable: retryable !== false });
        return;
      }
      const feedback: EvaluationResult = await res.json();
      setScores((s) => [...s, feedback.score]);
      setStreak(feedback.streak);
      setState({ status: 'feedback', card, feedback });
    } catch {
      setState({ status: 'error', error: 'Network error during evaluation.', retryable: true });
    }
  }

  // ---- render ----
  const progress = slots.length > 0 ? `${Math.min(slotIndex + 1, slots.length)} / ${slots.length}` : '';

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">← Home</Link>
        <span>{progress}</span>
      </div>

      {state.status === 'loading' && <Centered>Loading…</Centered>}

      {state.status === 'no_cards' && (
        <Centered>
          <p className="text-lg font-medium">Nothing due right now 🎉</p>
          <p className="mt-2 text-sm text-gray-500">Come back tomorrow, or practice ahead of schedule.</p>
          <Link
            href={`/practice?mode=${mode}&all=1`}
            className="mt-4 inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Practice anyway
          </Link>
        </Centered>
      )}

      {(state.status === 'answering' || state.status === 'recording') && (
        <div>
          <QuestionHeader question={state.card.question} ephemeral={state.card.ephemeral} />
          {state.status === 'answering' && (
            <div className="mt-8 space-y-6">
              <button
                onClick={() => startRecording(state.card)}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-3xl text-white shadow-lg hover:bg-red-700"
                title="Record your answer"
              >
                🎙
              </button>
              <p className="text-center text-sm text-gray-500">
                Tap to answer out loud (preferred) — or type below.
              </p>
              {micError && <p className="text-center text-sm text-red-600">{micError}</p>}
              <div>
                <textarea
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Type your answer…"
                  rows={5}
                  className="w-full rounded-md border border-gray-300 p-3 text-sm"
                />
                <button
                  onClick={() => {
                    answerTypeRef.current = 'text';
                    if (typed.trim()) evaluate(state.card, typed.trim());
                  }}
                  disabled={!typed.trim()}
                  className="mt-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Submit typed answer
                </button>
              </div>
            </div>
          )}
          {state.status === 'recording' && (
            <div className="mt-8 space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-red-600 text-3xl text-white">
                ⏺
              </div>
              <p className="font-mono text-lg">
                {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
              </p>
              <button
                onClick={() => recorderRef.current?.stop()}
                className="rounded-md bg-black px-6 py-2 text-sm font-medium text-white"
              >
                Stop &amp; transcribe
              </button>
            </div>
          )}
        </div>
      )}

      {state.status === 'confirming' && (
        <div>
          <QuestionHeader question={state.card.question} ephemeral={state.card.ephemeral} />
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Transcript — fix any speech-to-text mistakes before grading:
            </p>
            <textarea
              defaultValue={state.transcript}
              onChange={(e) => setTyped(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-gray-300 p-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => evaluate(state.card, (typed || state.transcript).trim())}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Grade it
              </button>
              <button
                onClick={() => startRecording(state.card)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
              >
                Re-record
              </button>
            </div>
          </div>
        </div>
      )}

      {state.status === 'processing' && (
        <Centered>
          <p className="animate-pulse text-lg">
            {state.step === 'transcribing' ? 'Transcribing your answer…' : 'Grading your answer…'}
          </p>
        </Centered>
      )}

      {state.status === 'feedback' && (
        <div>
          <QuestionHeader question={state.card.question} ephemeral={state.card.ephemeral} />
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white ${scoreColor(state.feedback.score)}`}
              >
                {state.feedback.score}
              </span>
              <span className="text-sm text-gray-500">out of 5</span>
              {!state.feedback.persisted && (
                <span className="text-xs text-amber-600">⚠ not saved</span>
              )}
            </div>
            <Section title="Coaching">{state.feedback.fullFeedback}</Section>
            {state.feedback.whatWasCoveredWell && (
              <Section title="What you covered well">{state.feedback.whatWasCoveredWell}</Section>
            )}
            {state.feedback.whatWasMissing && (
              <Section title="What was missing">{state.feedback.whatWasMissing}</Section>
            )}
            {state.feedback.modelAnswer && (
              <details className="rounded-md border border-gray-200 p-3">
                <summary className="cursor-pointer text-sm font-medium">Model answer</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {state.feedback.modelAnswer}
                </p>
              </details>
            )}
            {state.feedback.goDeeper.length > 0 && (
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-sm font-medium">Go deeper</p>
                <ul className="mt-1 space-y-1">
                  {state.feedback.goDeeper.map((l) => (
                    <li key={l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-700 underline"
                      >
                        {l.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={next}
              className="w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white"
            >
              {slotIndex + 1 >= slots.length ? 'Finish session' : 'Next question'}
            </button>
          </div>
        </div>
      )}

      {state.status === 'session_complete' && (
        <Centered>
          <p className="text-2xl font-bold">Session complete</p>
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>{scores.length} answered</p>
            {scores.length > 0 && (
              <p>Average score {(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}</p>
            )}
            <p>🔥 {streak}-day streak</p>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
              Home
            </Link>
            <Link
              href={`/practice?mode=${mode}&all=1`}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Keep practicing
            </Link>
          </div>
        </Centered>
      )}

      {state.status === 'error' && (
        <Centered>
          <p className="text-red-600">{state.error}</p>
          <div className="mt-4 flex justify-center gap-2">
            {state.retryable && (
              <button
                onClick={() => enterSlot(slots, slotIndex)}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Retry this question
              </button>
            )}
            <Link href="/" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
              Home
            </Link>
          </div>
        </Centered>
      )}
    </main>
  );
}

function QuestionHeader({ question, ephemeral }: { question: Question; ephemeral: boolean }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: getCategoryColor(question.category) }}
        >
          {getCategoryLabel(question.category)}
        </span>
        <span className="text-xs uppercase tracking-wide text-gray-400">
          {ephemeral ? 'generated for you' : question.mode}
        </span>
      </div>
      <h2 className="text-xl font-semibold leading-snug">{question.prompt}</h2>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{children}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="py-24 text-center">{children}</div>;
}

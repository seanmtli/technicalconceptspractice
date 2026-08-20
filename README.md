# DataPractice

A web app for **actually understanding** technical concepts — not memorizing them.
You explain a concept out loud (or in writing), and an AI coach grades you against a
concept rubric, tells you exactly what you missed, and links you to real articles
from [ByteByteGo](https://blog.bytebytego.com) and
[Technically](https://read.technically.dev) to go deeper. Spaced repetition (SM-2)
brings weak concepts back until they stick.

## Two practice modes

- **Concept drilling** — "Explain what MCP is." Graded against the question's
  key-concept rubric: can you explain X?
- **Contextual practice** — "How does Docker relate to containerization?" Graded on
  reasoning quality (accuracy, tradeoffs, practical grounding): can you connect and
  apply X? Contextual questions come from a seeded bank *and* are generated live
  from the concepts you've been missing.

Voice answers are the point — speaking forces real recall. Typing is always
available as a fallback.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — one deployable; API route
  handlers keep all secrets server-side
- **Supabase** — Postgres + auth, RLS on all per-user tables
- **ElevenLabs Scribe** — speech-to-text
- **OpenRouter** — evaluation/coaching LLM (models configurable via env)

## Setup

```bash
npm install
cp .env.example .env   # fill in keys (see below)
npm run seed           # load the question bank
npm run dev
```

Environment variables (`.env`):

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | LLM calls (evaluation, generation, crawling) |
| `OPENROUTER_EVAL_MODEL` | grading model (default: anthropic/claude-sonnet-4.5) |
| `OPENROUTER_CHEAP_MODEL` | summarize/generate model (default: google/gemini-2.5-flash) |
| `ELEVENLABS_API_KEY` | speech-to-text |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | seed/crawl scripts only — never imported by app code |
| `SUPABASE_DB_PASSWORD` | `supabase db push` migrations |

## Scripts

```bash
npm run seed            # idempotent question-bank seed
npm run crawl-sources   # crawl free ByteByteGo/Technically articles into the
                        # sources table and link them to questions
                        # (CRAWL_LIMIT=40 for a partial pass; resumable)
npm test                # vitest (SM-2, queue interleave, LLM-response validation)
```

## Architecture notes

- `lib/srs.ts` — SM-2 scheduling, pure and unit-tested
- `lib/queue.ts` — due-queue + mixed-mode interleave (4 drills : 1 contextual)
- `lib/prompts.ts` — all LLM prompts; grading feedback length is proportional to
  errors (terse praise for a 5, thorough correction for a 1)
- `record_review()` (Postgres) — atomic writeback: review + schedule + concept
  gaps + streak in one transaction
- Per-user scheduling is lazy: a question with no `card_schedules` row is due now,
  so new users need no setup
- Design spec: `docs/superpowers/specs/2026-08-20-web-app-redesign-design.md`

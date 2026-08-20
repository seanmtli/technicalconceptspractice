# Project Instructions for Claude

## Secrets Management

**NEVER commit API keys or secrets to the repository.**

- Store secrets in `.env` (gitignored); `.env.example` is the template
- Server code reads secrets from `process.env` in API route handlers and scripts
  only — never in client components, never behind `NEXT_PUBLIC_`
- `SUPABASE_SERVICE_ROLE_KEY` is for `scripts/` only; app code uses the anon key
  with RLS

## Git Workflow

**Always commit and push changes after completing a feature or significant change.**

1. Implement the feature
2. `npx tsc --noEmit` and `npm test` must pass
3. Stage relevant files, commit with conventional-commit messages
   (`feat:` / `fix:` / `refactor:` / `docs:`)
4. Push to remote

## Project Overview

DataPractice is a Next.js web app that helps users **explain and apply** technical
concepts rather than memorize them. Users answer by voice (preferred) or text; an
LLM grades against a concept rubric and links source articles; SM-2 spaced
repetition schedules review.

Two modes: **drill** (explain one concept, graded on key-concept coverage) and
**contextual** (relate/apply concepts, graded on reasoning quality). Contextual
questions come from the bank and from live generation off the user's concept gaps.

## Key Layout

- `app/` — pages (`/`, `/login`, `/practice`) and API routes
  (`/api/transcribe`, `/api/evaluate`, `/api/contextual`)
- `lib/` — `srs.ts` (SM-2), `queue.ts` (due + interleave), `prompts.ts` (all LLM
  prompts), `openrouter.ts` (LLM client), `elevenlabs.ts` (STT),
  `types.ts`, `categories.ts`, `supabase/`
- `scripts/` — `seed.ts`, `crawl-sources.ts`, `data/` (question bank source)
- `supabase/migrations/` — schema; apply with
  `supabase db push --linked -p "$SUPABASE_DB_PASSWORD"`

## Database

- Supabase Postgres, project ref `jmyrffyrllzurpbopfwr`
- Shared bank (`questions`, `sources`): authenticated read-only; writes via
  service-role scripts
- Per-user tables (`card_schedules`, `review_records`, `concept_gaps`,
  `user_stats`): RLS to own rows
- All post-answer writes go through the `record_review()` Postgres function —
  keep it atomic; don't add sequential client-side writes
- After schema changes: new migration file + `supabase db push` +
  `supabase gen types typescript --linked > lib/supabase/database.types.ts`

## Adding New Categories

1. Add to `Category` type in `lib/types.ts`
2. Add a `CategoryInfo` entry in `lib/categories.ts`

(Category values are plain text in Postgres — no migration needed.)

# DataPractice Web App Rebuild — Design Spec

## 1. Context

The existing React Native/Expo app (practice explaining technical concepts aloud, AI-graded, SM-2 scheduled) is being scrapped as a mobile app and rebuilt as a **web app, in place, in this repo**. Design was brainstormed and approved with the user. The product goal: help someone **shore up genuine understanding** of technical concepts by explaining them in their own words — audio preferred — and getting coached feedback that is grounded in real, linkable sources (ByteByteGo, Technically).

**Product definition — two modes, one engine:**
- **Concept drilling**: "Explain what MCP is." Graded against the question's `key_concepts` rubric. Tests *can you explain X*.
- **Contextual practice**: "How does Docker relate to containerization?" / "How do you think about the ROI of an AI agent?" Graded on reasoning quality (no single right answer). Tests *can you connect and apply X*. Fed by a seeded bank **and** on-the-fly generation from the user's own weak concepts — mode 2 is the payoff of mode 1.
- Both modes ride the same SM-2 spaced-repetition queue. Audio answers are the primary input (browser mic → ElevenLabs Scribe STT); typed answers always available as fallback.

**Success criteria for v1:** the user can log in, run a mixed practice session end-to-end with voice, get scored coaching feedback with "go deeper" article links, and see cards reschedule + streak update. Deferred features (§13) don't block daily use.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Audience | Single user now, multi-user-ready | Supabase auth + RLS from day one; zero rework to add users |
| Stack | Next.js (App Router) + TypeScript + Tailwind | One deployable; API route handlers keep all secrets server-side |
| Backend | Supabase hosted Postgres + Auth, via **Supabase CLI** (login/link/db push — no Docker, no MCP dependency) | Remote-only CLI workflow; MCP connector is unauthenticated and not required |
| LLM | OpenRouter (existing `OPENROUTER_API_KEY`); models env-configurable | Strong model for evaluation, cheap model for crawl summarization |
| STT | ElevenLabs Scribe (`scribe_v1`), new `ELEVENLABS_API_KEY` | User-specified |
| Grounding | Curated `sources` library crawled from free articles: blog.bytebytego.com, read.technically.dev, technically.dev | Predictable, fast, no per-answer search cost; links + summaries only, never full text |
| SRS | Keep SM-2 (port existing module) | It's what makes this a practice system, not a quiz toy |
| Content | Port all 102 questions + new categories (system-design, ai-agents) generated from sources | Existing keyConcepts rubric work is the asset |
| Repo | Replace in place; RN/Expo code deleted (survives in git history) | User chose clean break, one repo |
| V1 scope | Login, home, practice loop (both modes, audio+text) | Onboarding chat, question browser, analytics, deploy → v2 |

## 3. What ports from the old app

| Asset | From | Notes |
|---|---|---|
| 102 seed questions | `src/data/seedQuestions.ts` (35), `src/data/technicalDefinitions.ts` (67) | `{prompt, category, difficulty, keyConcepts, sourceReferences}`; keyConcepts doubles as grading rubric and gap taxonomy |
| SM-2 module | `src/services/spacedRepetition.ts` | 107 pure lines, zero RN deps. Port verbatim + unit tests |
| Evaluation prompt | `src/services/claudeApi.ts` (`EVALUATION_PROMPT`) | Keep the 5-point concept-coverage rubric and the "feedback length proportional to errors" instruction; extend with a go-deeper citation section |
| Retry/validation client | `src/services/claudeApi.ts` + `apiClient.ts` | Exponential backoff (2 retries, non-retryable short-circuit), JSON-fence stripping, score/array coercion |
| `PracticeState` union | `src/types/index.ts` | `loading \| no_cards \| answering \| recording \| processing \| feedback \| session_complete \| error` — port as the practice page's state machine |
| Categories + difficulties | `src/constants/categories.ts` | 12 categories with label/color; drop MDI icon names |
| Due-card priority | `database.ts` `getDueCardsWithPriority()` | Preferred categories first (stated priority order), then due date — becomes a SQL `ORDER BY` |
| Concept-gap aggregation | `database.ts` `updateConceptGaps()` | Per-answer misses → cross-question weakness ranking; feeds contextual generation |

**Left behind:** all RN/Expo/ios code, fake auth (`placeholder-token`), react-native-paper UI, JSON-in-TEXT SQLite schema, client-bundled API key, broken `knowledgeEnhancer` import, stale README claims.

## 4. Architecture

```
Browser (React client components)
  │  mic: MediaRecorder → Blob          typed answer: string
  ▼
Next.js route handlers (all secrets live here)
  ├─ POST /api/transcribe   → ElevenLabs Scribe
  ├─ POST /api/evaluate     → OpenRouter grade + persist writeback
  ├─ POST /api/contextual   → OpenRouter question generation
  └─ Supabase JS (@supabase/ssr, cookie sessions) → Postgres (RLS)
Scripts (local, service-role key)
  ├─ scripts/crawl-sources.ts  → sources table
  └─ scripts/seed.ts           → questions table
```

Target structure:

```
app/
  login/page.tsx            # email+password sign in / sign up (Supabase)
  page.tsx                  # home: due counts per mode, streak, start buttons
  practice/page.tsx         # the loop (client component, PracticeState machine)
  api/transcribe/route.ts
  api/evaluate/route.ts
  api/contextual/route.ts
middleware.ts               # session refresh + auth guard (all routes except /login)
lib/
  srs.ts                    # ported SM-2 (pure)
  srs.test.ts
  prompts.ts                # evaluation, contextual-generation, reasoning-rubric, summarize prompts
  openrouter.ts             # ported retry/validation client (server-only)
  elevenlabs.ts             # STT call (server-only)
  queue.ts                  # due-queue + mixed-mode interleave logic
  types.ts                  # Question, ReviewRecord, PracticeState, EvaluationResult…
  supabase/{server.ts,client.ts,database.types.ts}
scripts/
  crawl-sources.ts          # npm run crawl-sources
  seed.ts                   # npm run seed
supabase/migrations/*.sql
docs/superpowers/specs/2026-08-20-web-app-redesign-design.md
```

## 5. Data model (Postgres, one migration file to start)

```sql
questions      id uuid pk, prompt text, category text, difficulty text,
               mode text check in ('drill','contextual') default 'drill',
               key_concepts text[], source_ids uuid[] default '{}',
               is_custom bool default false, created_at timestamptz
sources        id uuid pk, url text unique, title text,
               publication text check in ('bytebytego','technically'),
               summary text, concepts text[], crawled_at timestamptz
card_schedules user_id uuid, question_id uuid, next_review_date timestamptz,
               ease_factor real default 2.5, interval_days int default 0,
               repetitions int default 0, pk (user_id, question_id)
review_records id uuid pk, user_id uuid, question_id uuid null,  -- null = ephemeral contextual
               question_prompt text,       -- denormalized so ephemeral questions keep their text
               mode text, answer_text text, answer_type text check in ('audio','text'),
               score int check 1..5, feedback jsonb,  -- {coaching, covered, missing, modelAnswer, goDeeper:[{title,url}]}
               missed_concepts text[], reviewed_at timestamptz
concept_gaps   user_id uuid, concept text, category text, missed_count int,
               last_missed_at timestamptz, pk (user_id, concept)
user_stats     user_id uuid pk, total_reviews int, current_streak int,
               longest_streak int, last_practice_date date
```

**RLS matrix:**

| Table | authenticated SELECT | authenticated INSERT/UPDATE | writes bypass |
|---|---|---|---|
| questions, sources | ✅ all rows (shared bank) | ❌ | service-role (seed/crawl scripts only) |
| card_schedules, review_records, concept_gaps, user_stats | own rows (`user_id = auth.uid()`) | own rows | — |

**Writeback is one Postgres function** `record_review(...)` (SECURITY INVOKER, called via `supabase.rpc`): inserts the review record, upserts the SM-2 schedule, upserts concept gaps, updates streak — atomically. Four sequential client writes would leave half-applied state on failure; one transactional function is also less code.

**Streak rule:** client sends its local date (`YYYY-MM-DD`) with each review. If `last_practice_date` = yesterday → streak+1; = today → unchanged; else → reset to 1. `longest_streak = max(longest, current)`.

**Lazy per-user scheduling:** no seeding step per user. Due queue = due `card_schedules` rows **plus** bank questions with no schedule row for this user (never-seen = due now). First review creates the row via `record_review`.

## 6. API contracts (all request bodies zod-validated; typed error codes so the UI can retry sensibly)

**POST /api/transcribe** — multipart form: `audio` (webm/opus from Chrome/Firefox, mp4/aac from Safari — Scribe accepts both; cap 5 min / 20 MB).
→ `200 {transcript}` | `4xx/5xx {error: 'AUDIO_TOO_LARGE'|'STT_FAILED'|'UNAUTHENTICATED'}`. On `STT_FAILED` the UI offers retry-upload or switch-to-typing (recording is held in memory client-side; audio is never stored server-side in v1).

**POST /api/evaluate** — `{questionId?, questionPrompt, mode, keyConcepts?, answerText, answerType, localDate}`. Handler: fetch linked sources (by `question.source_ids`) → OpenRouter with mode-appropriate rubric → validate/coerce LLM JSON (ported logic) → `record_review` RPC → `200 {score, feedback, missedConcepts, modelAnswer, goDeeper, streak}`. If grading succeeds but persist fails: still return the feedback with `persisted:false` so the user never loses coaching; UI shows a "not saved" note.
Guardrails: answerText capped at 8k chars; score coerced to 1–5 int; `missedConcepts` coerced to array; one retry on malformed LLM JSON with a "return only JSON" nudge.

**POST /api/contextual** — `{recentConcepts: string[]}`. Handler: top 5 `concept_gaps` by `missed_count` + recent concepts → OpenRouter generates one relational/scenario question `{prompt, focusConcepts, category}`. Ephemeral: no `questions` row; graded via /api/evaluate with `questionId: null`.

**Rubrics (lib/prompts.ts):** drill = ported concept-coverage rubric (1–5 anchored to keyConcepts covered). Contextual = reasoning rubric: accuracy of the relationship, tradeoff awareness, practical grounding — same 1–5 scale so SM-2 and stats stay uniform.

## 7. Practice loop & queue rules (concrete)

- **Queue:** due cards for chosen mode (`drill` | `contextual` | `mixed`), ordered by user's preferred-category priority then due date, session cap 10 cards. **Mixed interleave rule:** after every 4 drill cards, insert 1 contextual card — from the due contextual bank if any, else generated via /api/contextual (only if the user has ≥1 concept gap; otherwise skip generation, stay drill-only).
- **Answer flow:** question → mic button (primary; `getUserMedia` denial → inline message + textarea fallback) or typed → transcribe (audio only) → **transcript shown for confirmation** (editable — STT errors shouldn't tank the grade) → evaluate → feedback card (score, coaching, covered/missing, model answer, go-deeper links) → next.
- **Session end:** inline summary (cards, avg score, streak). No separate sessions table in v1 — summarize client-side; `review_records` timestamps can reconstruct sessions later if ever needed.
- **Home page:** due counts per mode (single grouped query), current streak, Start buttons. Empty states: no due cards → "come back tomorrow" + practice-anyway (ignores due dates); brand-new user → everything is due.

## 8. Source library pipeline (`npm run crawl-sources`, idempotent, resumable)

1. **Enumerate:** all three sites are Substack-backed (`technically.dev` fronts `read.technically.dev`). Use the Substack archive JSON endpoint (`/api/v1/archive?offset=&limit=`) which flags `audience: 'everyone'` vs `'only_paid'` — skip paid posts *before* fetching. Fall back to sitemap scrape if the endpoint shape changed.
2. **Fetch politely:** ~1 req/sec, proper User-Agent, skip on non-200, cache raw HTML in `scratch/crawl-cache/` so re-runs don't re-fetch.
3. **Extract & tag:** strip to article text; truncated/paywalled body detected mid-page → skip. Cheap OpenRouter model writes a 2–3 sentence summary + 3–8 concept tags (normalized lowercase, constrained: prefer tags from the union of all question keyConcepts, free tags allowed).
4. **Upsert** into `sources` by URL (service-role key).
5. **Link:** `source_ids` on each question = sources sharing ≥1 normalized concept, same-category preferred, cap 3 per question. Print a match-rate report; if <50% of questions get a source, do one LLM-assisted linking pass (batch: question + candidate titles/summaries → picks).
- **Cost note:** a few hundred articles × cheap model ≈ single-digit dollars, one-time.

## 9. Environment & configuration

`.env` (gitignored) / `.env.example` (committed, updated):
```
OPENROUTER_API_KEY=            # exists
OPENROUTER_EVAL_MODEL=anthropic/claude-sonnet-4.5   # evaluation/coaching — quality matters
OPENROUTER_CHEAP_MODEL=        # crawl summarization / contextual generation
ELEVENLABS_API_KEY=            # user provides
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # scripts only, never imported by app code
```

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Substack blocks/changed API on crawl | Cache-first crawler, sitemap fallback, polite rate; worst case: seed `sources` manually from the ~67 existing technically.dev sourceReferences and add ByteByteGo incrementally |
| Safari records mp4 not webm | Don't hardcode mime: pick from `MediaRecorder.isTypeSupported` list; Scribe accepts both; verify in Safari during step 5 |
| STT mis-transcribes jargon (worst-case: tanks the grade) | Transcript confirmation/edit step before evaluation (§7) |
| LLM returns malformed JSON | Ported validator + one corrective retry; unit-tested |
| Half-applied writeback | Single `record_review` Postgres function, transactional |
| Concept string matching too brittle for source links | Normalized tags constrained to the question-concept vocabulary; match-rate report + LLM-assisted linking pass if <50% |
| ElevenLabs cost/limits | 5-min cap per recording; personal use ≈ pennies/session |
| Supabase CLI needs Docker | It doesn't for this workflow — remote-only commands (`login/link/db push/gen types --linked`); no `supabase start` |

## 13. Final verification

- `npx tsc --noEmit`, ESLint, and unit tests (SM-2, evaluation validator, queue interleave) green
- Seed + crawl scripts idempotent (run twice, counts stable)
- Browser E2E (dev server): sign up → log in → mixed session → record audio → confirm transcript → scored feedback with ≥1 working go-deeper link → `card_schedules` row updated with new interval → streak increments → session summary
- Contextual path: after a low-scoring drill answer, a generated contextual question referencing that concept appears in mixed mode
- RLS: second test account sees zero of first account's schedules/reviews/gaps/stats; anon key cannot write questions/sources
- Mic-denied and STT-failure paths land in typing fallback without losing the session

## 14. V2 backlog (explicitly deferred)

Onboarding chat (prompts preserved in git history), question-bank browser, progress analytics dashboard, AI question-generation UI, audio storage/playback, practice-session history table, deployment (Railway/Vercel), magic-link auth, LLM-judge eval harness for grading quality.

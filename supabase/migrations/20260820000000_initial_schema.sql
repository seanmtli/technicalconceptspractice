-- DataPractice initial schema
-- Shared bank (questions, sources): readable by all authenticated users, written
-- only by service-role scripts. Per-user tables: RLS to own rows.

create table questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  category text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  mode text not null default 'drill' check (mode in ('drill', 'contextual')),
  key_concepts text[] not null default '{}',
  source_ids uuid[] not null default '{}',
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  publication text not null check (publication in ('bytebytego', 'technically')),
  summary text not null default '',
  concepts text[] not null default '{}',
  crawled_at timestamptz not null default now()
);

create table card_schedules (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  next_review_date timestamptz not null default now(),
  ease_factor real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  primary key (user_id, question_id)
);
create index card_schedules_due_idx on card_schedules (user_id, next_review_date);

create table review_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid references questions (id) on delete set null, -- null = ephemeral contextual question
  question_prompt text not null,
  mode text not null default 'drill' check (mode in ('drill', 'contextual')),
  answer_text text not null,
  answer_type text not null check (answer_type in ('audio', 'text')),
  score int not null check (score between 1 and 5),
  feedback jsonb not null default '{}',
  missed_concepts text[] not null default '{}',
  reviewed_at timestamptz not null default now()
);
create index review_records_user_idx on review_records (user_id, reviewed_at desc);

create table concept_gaps (
  user_id uuid not null references auth.users (id) on delete cascade,
  concept text not null,
  category text not null,
  missed_count int not null default 1,
  last_missed_at timestamptz not null default now(),
  primary key (user_id, concept)
);
create index concept_gaps_rank_idx on concept_gaps (user_id, missed_count desc);

create table user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_reviews int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_practice_date date
);

-- Row level security
alter table questions enable row level security;
alter table sources enable row level security;
alter table card_schedules enable row level security;
alter table review_records enable row level security;
alter table concept_gaps enable row level security;
alter table user_stats enable row level security;

create policy "questions are readable" on questions
  for select to authenticated using (true);
create policy "sources are readable" on sources
  for select to authenticated using (true);

create policy "own card_schedules" on card_schedules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "own review_records" on review_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "own concept_gaps" on concept_gaps
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "own user_stats" on user_stats
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Atomic post-answer writeback: review record + SM-2 schedule + concept gaps + streak.
-- SM-2 values are computed in application code (lib/srs.ts); this just persists them
-- in one transaction. SECURITY INVOKER so RLS applies. Returns the current streak.
create function record_review(
  p_question_id uuid,          -- null for ephemeral contextual questions
  p_question_prompt text,
  p_mode text,
  p_category text,
  p_answer_text text,
  p_answer_type text,
  p_score int,
  p_feedback jsonb,
  p_missed_concepts text[],
  p_next_review timestamptz,   -- ignored when p_question_id is null
  p_ease real,
  p_interval_days int,
  p_repetitions int,
  p_local_date date            -- the user's local calendar date, for the streak
) returns int
language plpgsql
security invoker
as $$
declare
  v_streak int;
  v_concept text;
begin
  insert into review_records
    (user_id, question_id, question_prompt, mode, answer_text, answer_type, score, feedback, missed_concepts)
  values
    ((select auth.uid()), p_question_id, p_question_prompt, p_mode, p_answer_text, p_answer_type, p_score, p_feedback, p_missed_concepts);

  if p_question_id is not null then
    insert into card_schedules as cs
      (user_id, question_id, next_review_date, ease_factor, interval_days, repetitions)
    values
      ((select auth.uid()), p_question_id, p_next_review, p_ease, p_interval_days, p_repetitions)
    on conflict (user_id, question_id) do update set
      next_review_date = excluded.next_review_date,
      ease_factor = excluded.ease_factor,
      interval_days = excluded.interval_days,
      repetitions = excluded.repetitions;
  end if;

  foreach v_concept in array coalesce(p_missed_concepts, '{}') loop
    insert into concept_gaps as cg (user_id, concept, category)
    values ((select auth.uid()), lower(trim(v_concept)), p_category)
    on conflict (user_id, concept) do update set
      missed_count = cg.missed_count + 1,
      last_missed_at = now();
  end loop;

  insert into user_stats as us (user_id, total_reviews, current_streak, longest_streak, last_practice_date)
  values ((select auth.uid()), 1, 1, 1, p_local_date)
  on conflict (user_id) do update set
    total_reviews = us.total_reviews + 1,
    current_streak = case
      when us.last_practice_date = p_local_date then us.current_streak
      when us.last_practice_date = p_local_date - 1 then us.current_streak + 1
      else 1
    end,
    longest_streak = greatest(us.longest_streak, case
      when us.last_practice_date = p_local_date then us.current_streak
      when us.last_practice_date = p_local_date - 1 then us.current_streak + 1
      else 1
    end),
    last_practice_date = p_local_date
  returning current_streak into v_streak;

  return v_streak;
end;
$$;

revoke execute on function record_review from public, anon;
grant execute on function record_review to authenticated;

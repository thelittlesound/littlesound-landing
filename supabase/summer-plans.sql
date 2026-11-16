-- Family Rhythm, Round 2: the Summer planner ("pencil in" a camp for a week).
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Read and written only by /api/families/summer with the service-role key
-- (RLS on, no client policies), like the other family calendar tables.

create table if not exists public.summer_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  kid_id text not null,            -- profiles.kids id (k_…)
  week_start date not null,        -- the Monday of the summer week
  activity_id text not null,       -- Discover id
  title text,                      -- snapshot for display
  provider text,
  website text,
  created_at timestamptz not null default now(),
  primary key (user_id, kid_id, week_start)
);
alter table public.summer_plans enable row level security;

notify pgrst, 'reload schema';

-- Calendar agent, Phase 1 Step B: family calendars + email alerts.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- All three tables are read and written only by server routes with the
-- service-role key (RLS on, no client policies) — same model as
-- activity_dates. The family dashboard talks to them through /api/families/*.

-- Each family's private calendar-subscription link. The token is the only
-- secret in the link (calendar apps can't sign in), so it's long and random,
-- and the family can reset it from the dashboard.
create table if not exists public.family_calendar_feeds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

-- The specific sessions a family is in ("Add to my calendar" on one session
-- of a saved program). activity_dates rows are replaced wholesale whenever a
-- listing's dates change, so a pick keeps its own copy of the session (item)
-- plus a key describing it. The daily alert job matches picks to the current
-- dates by that key and tells the family when one moved or disappeared.
create table if not exists public.calendar_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  session_key text not null,
  item jsonb not null,            -- the DateItem as it was when picked (or last matched)
  title text,                     -- activity title, for emails and the feed
  provider text,
  status text not null default 'active' check (status in ('active', 'changed', 'gone')),
  change_note text,               -- e.g. "Was Sat 9am–10am"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_id, session_key)
);
create index if not exists calendar_picks_user_id_idx on public.calendar_picks (user_id);

-- One row per alert already emailed, so nothing is sent twice.
create table if not exists public.family_alert_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, alert_key)
);

-- Email alerts are on by default for families with saved activities; every
-- email has a one-click unsubscribe, and the dashboard has an on/off switch.
alter table public.profiles
  add column if not exists email_alerts boolean not null default true;

alter table public.family_calendar_feeds enable row level security;
alter table public.calendar_picks enable row level security;
alter table public.family_alert_log enable row level security;

-- Make the new column visible to the API right away.
notify pgrst, 'reload schema';

-- Discovery agent (2026-11-16): finds kids' programs that aren't on Little
-- Sound yet by searching the web, sport by sport and area by area, and files
-- them in suggested_listings for an admin to Add or Dismiss.
-- Also: team-sport details (level, who can join) on suggestions and listings.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- The code works before this runs (it saves suggestions without the new
-- columns), but the Agent tab can't show search progress until it has.

-- One row per search (sport × area): when it last ran and what it found.
create table if not exists public.discovery_queries (
  key text primary key,              -- e.g. "soccer|west-seattle"
  last_run_at timestamptz,
  last_status text,                  -- ok | error
  found int not null default 0,      -- programs the AI reported
  added int not null default 0,      -- new suggestions filed
  message text
);
alter table public.discovery_queries enable row level security;  -- server only, no client policies

-- Team-sport details, plus where a search found it.
alter table public.suggested_listings add column if not exists level text;       -- 'rec' | 'club'
alter table public.suggested_listings add column if not exists serves text;      -- who can join
alter table public.suggested_listings add column if not exists source_url text;  -- the own-site page the facts came from

alter table public.submissions add column if not exists level text;
alter table public.submissions add column if not exists serves text;

notify pgrst, 'reload schema';

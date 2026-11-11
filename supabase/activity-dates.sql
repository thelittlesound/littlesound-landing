-- Little Sound — Activity dates (calendar agent, Phase 1)
-- Run this once in the Supabase SQL editor BEFORE pushing the code that uses
-- it. Safe to re-run.

-- ── activity_dates ──────────────────────────────────────────────────────────
-- Approved schedule facts for a listing, entered by Kelly/Evan through the AI
-- date tool in /admin (Dates tab). Only approved dates are stored here — the
-- AI's draft lives in the admin's browser until they save it.
--
-- activity_id is the Discover id: "1".."79" for seed listings (claimed seeds
-- keep the same id, so their dates carry over) or "sub_<uuid>" for
-- provider-submitted listings.
--
-- Two kinds of row, both a window with a start and an end:
--   session      — when the program runs. A weekly class uses days_of_week
--                  (iCal codes MO..SU) + start/end time between start_date and
--                  end_date. A one-week camp is just a date range + times.
--   registration — when signups open (start_*) and close (end_*).
--
-- All dates and times are Seattle wall-clock time (America/Los_Angeles). No
-- UTC conversion anywhere: calendars get them with an explicit time zone.

create table if not exists public.activity_dates (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null,
  kind text not null check (kind in ('session', 'registration')),
  label text,                 -- e.g. "Summer Week 3 — Robotics", "Summer 2027 registration"
  start_date date,
  end_date date,
  days_of_week text[],        -- sessions only, e.g. {MO,WE}
  start_time time,            -- local Seattle time
  end_time time,
  location text,
  notes text,
  source_url text,            -- the provider page the dates came from
  source_excerpt text,        -- the exact text the dates were read from, for re-checking
  approved_by text,
  approved_at timestamptz not null default now(),
  constraint activity_dates_range_ok check (end_date is null or start_date is null or end_date >= start_date),
  constraint activity_dates_days_ok check (
    days_of_week is null or days_of_week <@ array['MO','TU','WE','TH','FR','SA','SU']::text[]
  )
);

create index if not exists activity_dates_activity_id_idx on public.activity_dates (activity_id);

-- RLS on with no client policies: read and written only by server routes with
-- the service-role key (same model as submissions / listing_claims).
alter table public.activity_dates enable row level security;

-- ── replace_activity_dates ──────────────────────────────────────────────────
-- Saving a listing's dates replaces the whole set in one transaction, so a
-- failed save can never leave a listing with its old dates deleted and its new
-- ones missing.
create or replace function public.replace_activity_dates(
  p_activity_id text,
  p_items jsonb,
  p_source_url text,
  p_approved_by text
) returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.activity_dates where activity_id = p_activity_id;

  insert into public.activity_dates (
    activity_id, kind, label, start_date, end_date, days_of_week,
    start_time, end_time, location, notes, source_url, source_excerpt, approved_by
  )
  select
    p_activity_id,
    i->>'kind',
    nullif(i->>'label', ''),
    nullif(i->>'start_date', '')::date,
    nullif(i->>'end_date', '')::date,
    case when jsonb_typeof(i->'days_of_week') = 'array' and jsonb_array_length(i->'days_of_week') > 0
         then array(select jsonb_array_elements_text(i->'days_of_week'))
         else null end,
    nullif(i->>'start_time', '')::time,
    nullif(i->>'end_time', '')::time,
    nullif(i->>'location', ''),
    nullif(i->>'notes', ''),
    nullif(p_source_url, ''),
    nullif(i->>'source_excerpt', ''),
    p_approved_by
  from jsonb_array_elements(p_items) as i;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- New functions are executable by everyone by default, and Supabase exposes
-- public-schema functions over its API. Lock this one to the service role.
revoke all on function public.replace_activity_dates(text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.replace_activity_dates(text, jsonb, text, text) to service_role;

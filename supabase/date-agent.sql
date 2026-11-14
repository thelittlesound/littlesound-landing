-- Little Sound — Date agent (automatic date finding)
-- Run this once in the Supabase SQL editor BEFORE pushing the code that uses
-- it. Safe to re-run. Requires activity-dates.sql to have been run first.

-- The agent visits each listing's website, has Claude read the schedule,
-- and either publishes verified dates straight to activity_dates, parks
-- uncertain ones in date_drafts for one-click review, or records why it
-- couldn't (blocked site, no text, no dates). It also proposes programs it
-- finds that aren't listings yet (suggested_listings).

-- ── listing_sources: what the agent last saw for each listing ──────────────
create table if not exists public.listing_sources (
  activity_id text primary key,       -- Discover id ("24", "sub_<uuid>")
  checked_urls text[],                -- pages it read last time
  page_hash text,                     -- fingerprint of their text; unchanged pages skip the AI
  last_checked_at timestamptz,
  last_changed_at timestamptz,        -- last time the page text was different
  last_status text,                   -- published | review | unchanged | no_dates | unreadable | error | skipped
  last_message text
);

-- ── date_drafts: the review inbox ───────────────────────────────────────────
create table if not exists public.date_drafts (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null,
  created_at timestamptz not null default now(),
  items jsonb not null,               -- DateItem[] the agent proposes
  warnings text[] not null default '{}',
  reason text,                        -- why it wasn't auto-published
  source_urls text[],
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists date_drafts_status_idx on public.date_drafts (status);
-- At most one open draft per listing; a newer check replaces it.
create unique index if not exists date_drafts_one_pending
  on public.date_drafts (activity_id) where status = 'pending';

-- ── suggested_listings: programs found on provider sites we don't list ─────
create table if not exists public.suggested_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dedupe_key text not null unique,    -- lower(business | title): never suggest the same thing twice
  found_on text not null,             -- activity_id of the listing whose site it was on
  business text,
  title text not null,
  category text,
  subcategory text,
  age_min int,
  age_max int,
  price numeric,
  price_unit text,
  description text,
  website text,                       -- page it was found on
  neighborhood text,
  items jsonb not null default '[]',  -- its dates, if any (DateItem[])
  status text not null default 'pending' check (status in ('pending', 'added', 'dismissed')),
  added_activity_id text,             -- the Discover id once added
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists suggested_listings_status_idx on public.suggested_listings (status);

-- Server-only, like every other table here: RLS on, no client policies.
alter table public.listing_sources enable row level security;
alter table public.date_drafts enable row level security;
alter table public.suggested_listings enable row level security;

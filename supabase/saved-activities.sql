-- Little Sound — Saved activities ("favorites") for families
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS throughout.

-- ── saved_activities table ──────────────────────────────────────────────────
-- One row per (family, activity). A family hearts an activity on /discover and
-- it appears on their dashboard.
--
-- activity_id matches the Discover Activity.id: "1".."79" for static seed
-- listings (app/data/activities.json), or "sub_<uuid>" for approved provider
-- submissions (see app/api/activities/route.ts).
--
-- The card's display fields are SNAPSHOTTED here at save time on purpose. The
-- family dashboard is a server component and can't cheaply re-resolve an id
-- against the live catalog (the seed JSON is bundled into the client; provider
-- listings come from an API). Snapshotting means the dashboard just reads these
-- rows and renders them, and a saved card stays intact even if the seed data is
-- later reordered or a provider edits their listing.

create table if not exists public.saved_activities (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  created_at timestamptz not null default now(),
  -- snapshot of the activity card at save time
  title text,
  provider text,
  category text,
  neighborhood text,
  age_min int,
  age_max int,
  price numeric,
  price_unit text,
  website text,
  primary key (user_id, activity_id)
);

create index if not exists saved_activities_user_id_idx
  on public.saved_activities (user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Unlike profiles / provider_profiles (whose rows are created server-side with
-- the service-role key), families create and delete their OWN saved rows
-- directly from the browser via the anon client. So RLS IS the security
-- boundary here — grant select / insert / delete scoped to the owning user.
-- No update policy: saving is insert (idempotent via upsert), removing is delete.

alter table public.saved_activities enable row level security;

drop policy if exists "Families can view their own saved activities" on public.saved_activities;
create policy "Families can view their own saved activities"
  on public.saved_activities for select
  using (auth.uid() = user_id);

drop policy if exists "Families can save activities" on public.saved_activities;
create policy "Families can save activities"
  on public.saved_activities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Families can remove their own saved activities" on public.saved_activities;
create policy "Families can remove their own saved activities"
  on public.saved_activities for delete
  using (auth.uid() = user_id);

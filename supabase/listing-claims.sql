-- Little Sound — Provider listing claims (ownership transfer)
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Run it BEFORE pushing the code that uses it. Safe to re-run.

-- ── listing_claims ──────────────────────────────────────────────────────────
-- A provider asks to take ownership of listings that already exist on the
-- site: static seed listings from app/data/activities.json (Discover ids
-- "1".."79") or pre-account `submissions` rows with no provider_id (Discover
-- ids "sub_<uuid>"). One request can cover several listings from the same
-- business (e.g. all five YMCA programs). Kelly/Evan approve or reject in
-- /admin; approval performs the transfer (see app/api/admin/claims/[id]).

create table if not exists public.listing_claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider_id uuid not null references auth.users (id) on delete cascade,
  activity_ids text[] not null,        -- Discover ids being claimed
  business_name text,                  -- business name on the listing(s), for display
  role text,                           -- claimant's relationship to the business
  message text,                        -- claimant's note / how to verify them
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists listing_claims_provider_id_idx on public.listing_claims (provider_id);
create index if not exists listing_claims_status_idx on public.listing_claims (status);

-- RLS on, with NO client-facing policies: claims are read and written only by
-- server routes using the service-role key (same model as `submissions`).
alter table public.listing_claims enable row level security;

-- ── submissions.seed_id ─────────────────────────────────────────────────────
-- When a claim on a static seed listing is approved, the seed is copied into
-- `submissions` (owned by the provider, status approved) and tagged with its
-- original seed id. That tag lets Discover hide the static copy, keeps the
-- listing's Discover id stable (families' saved hearts keep working), and —
-- via the unique index — makes it impossible for one seed listing to be
-- imported twice, even if two approvals race.

alter table public.submissions
  add column if not exists seed_id text;

create unique index if not exists submissions_seed_id_key
  on public.submissions (seed_id)
  where seed_id is not null;

-- Little Sound — Provider auth: provider_profiles table + submissions link
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run.

-- ── provider_profiles table ─────────────────────────────────────────────────
-- One row per provider account, keyed to auth.users.id. Created server-side
-- (service role) by /api/providers/signup, mirroring how profiles works for
-- families.

create table if not exists public.provider_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name text,
  email text,
  business_name text,
  category text,
  website text,
  phone text
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists provider_profiles_set_updated_at on public.provider_profiles;
create trigger provider_profiles_set_updated_at
  before update on public.provider_profiles
  for each row
  execute function public.set_updated_at();

alter table public.provider_profiles enable row level security;

drop policy if exists "Providers can view their own profile" on public.provider_profiles;
create policy "Providers can view their own profile"
  on public.provider_profiles for select
  using (auth.uid() = id);

drop policy if exists "Providers can update their own profile" on public.provider_profiles;
create policy "Providers can update their own profile"
  on public.provider_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy — rows are created server-side via the service-role key
-- in /api/providers/signup.

-- ── Link submissions to the provider who created them ──────────────────────
-- Nullable so existing rows (created before provider auth existed) don't
-- break — they just show up with no linked provider.
alter table public.submissions
  add column if not exists provider_id uuid references auth.users (id) on delete set null;

create index if not exists submissions_provider_id_idx on public.submissions (provider_id);

-- No new RLS policy needed on submissions — the provider dashboard reads
-- via the service-role key server-side (same pattern as /admin), filtered
-- to the logged-in provider's own id in application code, not via RLS.

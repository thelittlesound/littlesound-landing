-- Little Sound — Family auth: profiles table
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

-- ── profiles table ──────────────────────────────────────────────────────────
-- One row per family account, keyed to auth.users.id. Created server-side
-- (service role) right after signup by /api/families/signup, so RLS below
-- only needs to allow the owning user to read/update their own row.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name text,
  email text,
  neighborhood text,
  kids jsonb not null default '[]'::jsonb,        -- e.g. [{"age": 9}, {"age": 4}]
  preferences text[] not null default '{}'::text[] -- e.g. {"Outdoor Adventure","STEM & Tech"}
);

-- Keep updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Families can view their own profile" on public.profiles;
create policy "Families can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Families can update their own profile" on public.profiles;
create policy "Families can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for regular users — profile rows are created by
-- /api/families/signup using the service-role key, which bypasses RLS.

-- Little Sound — Admin auth: admin_users allowlist
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run.

-- ── admin_users table ───────────────────────────────────────────────────────
-- Membership table: a row here means that auth.users.id is allowed into
-- /admin. Deliberately has NO client-facing RLS policies — it's only ever
-- read using the service-role key, from middleware.ts and the admin API
-- routes. Regular users (including admins themselves) cannot query this
-- table directly through the anon/browser client.

create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- Intentionally no policies — locked to service-role access only.

-- ── Adding an admin ─────────────────────────────────────────────────────────
-- There's no signup form for this on purpose — admins are added by hand:
--
-- 1. Supabase dashboard → Authentication → Users → Add user.
--    Set the person's email + a password (they can change it later once
--    there's a "change password" flow — for now, share it with them directly).
-- 2. Copy the new user's UUID from the Users list.
-- 3. Table Editor → admin_users → Insert row:
--      id    = the UUID from step 2
--      email = their email (for readability in the table, not used for auth)
--
-- That's it — they can now sign in at /admin/login.

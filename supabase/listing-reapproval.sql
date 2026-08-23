-- Little Sound — Listing editing: re-approval flag on submissions
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.

-- Providers can now edit their own listings (app/providers/listings/[id]/edit).
-- When a provider edits an ALREADY-APPROVED listing, we keep it live on Discover
-- (status stays 'approved') but flag it so the team re-approves the change. The
-- flag has to be separate from `status`, because Discover shows only
-- status='approved' — flipping status back to 'pending' would pull the live
-- listing off the site until re-approved, which we don't want.
--
--   reapproval_needed = true  → an approved, still-live listing whose content
--                               was edited and is awaiting the team's re-review
--                               (surfaced in /admin; cleared when an admin
--                               approves or rejects the change).
--   edited_at                 → when the listing was last edited by its provider.
--
-- Editing a pending listing leaves it pending; editing a rejected listing
-- resubmits it as pending (handled in app code, no flag needed for those).

alter table public.submissions
  add column if not exists reapproval_needed boolean not null default false;

alter table public.submissions
  add column if not exists edited_at timestamptz;

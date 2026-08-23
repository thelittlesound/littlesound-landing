# Little Sound — Deployment Guide

Covers environment variables, third-party services, and how a deploy actually happens today. For what's built and what's left, see `BUILD_STATUS.md`.

---

## Services in use

| Service | What it's for |
|---|---|
| **Vercel** | Hosting + auto-deploy on push to `main` |
| **Supabase** | Postgres database, Supabase Auth (families, providers, admin), Row Level Security | 
| **Brevo** | Waitlist contact list, provider contact list, and custom SMTP relay for branded auth emails |
| **GitHub** | `github.com/thelittlesound/littlesound-landing` — Vercel deploys from here |

---

## Environment variables

Set these in Vercel (**Project → Settings → Environment Variables**) and mirror them in a local `.env.local` for development. **Never commit real values to the repo** — `.env.local` is gitignored, and no real key should ever be pasted into a markdown file that gets committed (this happened once already with an old Brevo key; if you find one in git history, rotate it).

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, never expose to the client

# Brevo
BREVO_API_KEY=
BREVO_PROVIDER_LIST_ID=

# Site-wide password gate
SITE_ACCESS_PASSWORD=               # required in production — site fails closed if unset

NEXT_PUBLIC_SITE_URL=https://www.thelittlesound.com
```

Locally, if `SITE_ACCESS_PASSWORD` isn't set, `npm run dev` falls back to a hardcoded dev password (`dev-preview`) so you can develop without setting it.

---

## Supabase setup

The database schema lives in `supabase/*.sql` — these are **not** run automatically as migrations, they're run manually, once, in the Supabase SQL editor:

- `supabase/family-profiles.sql` — `profiles` table (family accounts)
- `supabase/provider-profiles.sql` — `provider_profiles` table + `submissions.provider_id` column
- `supabase/admin-users.sql` — `admin_users` allowlist table

If you ever spin up a fresh Supabase project (new environment, disaster recovery, etc.), run these three files in order, then add rows to `admin_users` for whoever should have admin access — there's no signup form for admin, it's manually granted.

**Auth settings to check in Supabase (Authentication → Settings / URL Configuration):**
- Site URL set to `https://www.thelittlesound.com`
- Redirect URLs include `https://www.thelittlesound.com/**` and `http://localhost:3000/**`
- "Confirm email" is ON
- Custom SMTP configured (Brevo relay, `smtp-relay.brevo.com:587`, sender `hello@thelittlesound.com`) — required for branded auth emails and to avoid Supabase's default low rate limit
- Email templates (confirm signup, reset password) — branded HTML versions are saved as reference copies in `supabase/email-templates/`, pasted directly into the Supabase dashboard

---

## Deploying

Deploys are automatic: push to `main` on GitHub, Vercel builds and deploys within a couple minutes. There's no manual deploy step.

```bash
git add .
git commit -m "Describe the change"
git push
```

Check the deploy at [vercel.com](https://vercel.com) → your project → Deployments. Roll back to a previous deployment from the same screen if something breaks.

---

## Domain

`thelittlesound.com` is pointed at Vercel via nameservers. If DNS ever needs to be redone: Vercel project → Settings → Domains → Add Domain → follow the nameserver instructions there, then update nameservers with the domain registrar.

---

## Post-deploy checklist (when shipping something that touches auth or the database)

- [ ] Test the affected flow end-to-end in production (signup, login, password reset, listing submission, admin approve/reject — whichever applies)
- [ ] Check Vercel function logs if anything errors (Project → Logs, filter by route)
- [ ] Confirm Supabase Auth email delivery still works (branded, from `hello@thelittlesound.com`)

---

## Troubleshooting

**Git lock errors (`index.lock` / `HEAD.lock`)**
Caused by OneDrive syncing the repo folder while git is trying to write. Fix: `del .git\index.lock` (or `HEAD.lock`) in PowerShell. If it keeps recurring, pause OneDrive sync temporarily (tray icon → Pause syncing) while committing.

**Auth email not arriving / rate-limited**
Confirm custom SMTP (Brevo) is still configured in Supabase — if it's ever reset to Supabase's default email service, expect only a handful of emails/hour before you hit the rate limit.

**A signup silently fails / foreign-key or not-null error in logs**
Check Vercel function logs for the specific error code. See "Bugs found + fixed" in `BUILD_STATUS.md` — a couple of subtle auth edge cases (duplicate email, stale dashboard cache) have already been hit and fixed; the fixes there are a good reference if something similar resurfaces.

**Site won't load at all, redirects to `/unlock` in a loop**
Check that `SITE_ACCESS_PASSWORD` is set correctly in Vercel and that the cookie domain matches.

---

## Questions

Reach out to Kelly or Evan. For what's built, what's left, and known issues, `BUILD_STATUS.md` is the file to check first.

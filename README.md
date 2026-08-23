# Little Sound

**The Family OS** — discover, compare, and connect with kids' activities and camps in one place. Built by Kelly and Evan Sherman for Seattle families.

- **Live site:** https://www.thelittlesound.com (currently password-gated — see "Current phase" below)
- **GitHub:** https://github.com/thelittlesound/littlesound-landing
- **Hosting:** Vercel, auto-deploys on push to `main`
- **For the full up-to-date build status, what's done, and what's next, see [`BUILD_STATUS.md`](./BUILD_STATUS.md) — that file is the source of truth, kept current after every build session.**

---

## Current phase

Phase 1 — Seattle Beta. The marketing site, discover/search page, and full account system (families, providers, admin) are built and live, but the site is password-gated behind `SITE_ACCESS_PASSWORD` because there are no real family or provider signups yet — the site isn't publicly launched.

---

## Tech stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS — design tokens in `little-sound-design-tokens.css` / `app/globals.css`
- **Auth + database:** Supabase (Postgres + Supabase Auth via `@supabase/ssr`, RLS enabled)
- **Transactional email:** Brevo (waitlist list management, provider contact list, and custom SMTP relay for branded Supabase auth emails)
- **Deployment:** Vercel

---

## What's actually built

This isn't just a landing page anymore. Three real account systems exist, each with signup, login, password recovery, and a session-protected dashboard:

- **Families** — `/families/signup`, `/families/login`, `/families/dashboard`
- **Providers** — `/providers/signup`, `/providers/login`, `/providers/dashboard`, plus a 4-step listing creation flow at `/providers/listings/new`
- **Admin** — `/admin/login`, `/admin` (allowlisted via a dedicated `admin_users` table — being logged in isn't enough on its own)

Plus:
- `/discover` — the family-facing search/browse page, merging static seed data (`app/data/activities.json`) with live approved provider submissions
- Site-wide password gate (`/unlock`) in front of the entire site
- `robots.txt` blocking known AI crawlers

See `BUILD_STATUS.md` for the full file-by-file breakdown, infrastructure details, and a running log of bugs found and fixed.

---

## Project structure

```
littlesound-landing-page/
├── app/
│   ├── admin/                    # Admin panel (login, dashboard)
│   ├── families/                 # Family signup, login, dashboard, password recovery
│   ├── providers/                # Provider signup, login, dashboard, listing creation, password recovery
│   ├── discover/                 # Family-facing search/browse page
│   ├── unlock/                   # Site-wide password gate entry
│   ├── api/
│   │   ├── families/signup/      # Family account creation
│   │   ├── providers/signup/     # Provider account creation
│   │   ├── providers/submit/     # Listing submission (requires provider login)
│   │   ├── admin/submissions/    # Admin: fetch + approve/reject submissions
│   │   ├── activities/           # Public: approved listings for Discover
│   │   ├── site-gate/            # Site-wide password check
│   │   └── waitlist/             # Legacy family waitlist (Brevo)
│   ├── components/               # Homepage sections + shared nav/footer
│   ├── data/activities.json      # Static seed listings
│   ├── for-families/, for-providers/, about/, terms/, privacy/   # Static marketing pages
│   ├── layout.tsx
│   ├── page.tsx                  # Homepage
│   └── globals.css
├── lib/
│   ├── supabase.ts                # Public + service-role Supabase clients
│   ├── supabase-browser.ts        # Cookie-backed client for client components
│   ├── supabase-server.ts         # Cookie-backed client for server components
│   ├── admin-auth.ts              # requireAdmin()
│   └── provider-auth.ts           # requireProvider()
├── supabase/                      # SQL migrations, run manually in Supabase SQL editor
├── middleware.ts                  # Site gate, session refresh, route protection for all three portals
├── little-sound-design-tokens.css
├── tailwind.config.js
├── BUILD_STATUS.md                # Source of truth for what's built and what's next
├── DEPLOYMENT_GUIDE.md            # Env vars + deploy steps
└── CONTENT_GUIDE.md               # Where to find and edit site copy
```

---

## Local development

```bash
npm install
npm run dev
```

You'll need a `.env.local` with the variables listed in `DEPLOYMENT_GUIDE.md`. Locally, the site-wide password gate falls back to a hardcoded dev password (`dev-preview`) so you don't need `SITE_ACCESS_PASSWORD` set to develop.

---

## Making changes

- **Copy/content:** see `CONTENT_GUIDE.md`
- **Deploying, env vars, Supabase/Brevo setup:** see `DEPLOYMENT_GUIDE.md`
- **What's built, what's next, known issues:** see `BUILD_STATUS.md`

Push to `main` and Vercel auto-deploys.

---

Less searching. More living. Families first.

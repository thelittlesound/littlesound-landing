# Little Sound — Build Status

## Project Overview
Family activity planning platform ("The Family OS") for Seattle. Helps parents discover, compare, and connect with kids' activities and camps in one place. Founded by Kelly and Evan Sherman.

- **Live site:** https://www.thelittlesound.com
- **GitHub:** https://github.com/thelittlesound/littlesound-landing
- **Hosting:** Vercel (auto-deploys on git push to main)
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Design tokens:** `app/globals.css` + `little-sound-design-tokens.css` — single source of truth for all colors, fonts, and spacing

---

## Current Phase
**Phase 1 — Seattle Beta (Q3 2026)** — still building, site is password-gated (not public yet)
- Marketing site built, not yet publicly launched
- Full auth stack is live and verified: families, providers, and admin all have real Supabase Auth accounts, session-protected dashboards, and password recovery
- No real family or provider signups yet — waitlist/provider counts shown on-site are catalogued research data (80+ providers researched in `app/data/activities.json`), not live signups. **Do not treat "100+ families" language anywhere on the site as real until the waitlist actually has real signups.**
- hello@thelittlesound.com active (Google Workspace)

---

## Completed Work

### Provider registration + admin flow (fully complete)

**End-to-end flow:**
Provider visits `/providers/signup` → fills out account form → redirected to `/providers/listings/new` → completes 4-step listing form → submission saved to Supabase + email sent to hello@ → Kelly/Evan review in `/admin` → Approve (listing appears on Discover) or Reject (removed from site, record kept)

**New files:**
| File | Route | Purpose |
|------|-------|---------|
| `app/providers/signup/page.tsx` | `/providers/signup` | Provider account form (name, email, business, category) |
| `app/providers/listings/new/page.tsx` | `/providers/listings/new` | 4-step listing creation (details → age/pricing → location → review) |
| `app/api/providers/submit/route.ts` | `POST /api/providers/submit` | Saves to Supabase + adds to Brevo provider list + emails hello@ |
| `app/admin/page.tsx` | `/admin` | Admin panel (review, approve, reject submissions) — see "Admin panel real auth" below for how this is actually secured today |
| `app/api/admin/submissions/route.ts` | `GET /api/admin/submissions` | Fetches submissions from Supabase (filterable by status) |
| `app/api/admin/submissions/[id]/status/route.ts` | `POST /api/admin/submissions/[id]/status` | Updates submission status + admin notes in Supabase |
| `app/api/activities/route.ts` | `GET /api/activities` | Returns approved submissions mapped to activity card shape |
| `lib/supabase.ts` | — | Supabase client (public) + supabaseAdmin (service role, server-only) |

**Infrastructure:**
- Supabase project: `https://eyuetlkggoaegtyhirbt.supabase.co` (West US / Oregon)
- `submissions` table: id, created_at, status, contact_name, contact_email, phone, title, category, subcategory, description, age_min, age_max, price, price_unit, neighborhood, website, admin_notes, reviewed_at, reviewed_by
- RLS enabled on Supabase project
- Brevo provider list: Little Sound Providers (List #5)
- ~~Admin password: `littlesound2026` (env var)~~ — superseded, see "Admin panel real auth" below

**Vercel env vars required (all set):**
- `BREVO_API_KEY`
- `BREVO_PROVIDER_LIST_ID` = 5
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Discover page integration:**
- `app/discover/page.tsx` now fetches `/api/activities` on load and merges approved provider submissions with static `activities.json` seed data
- Category mapping handled in API route (e.g. "STEM & Tech" → "STEM")
- Rejecting a listing removes it from Discover; no delete — all submissions kept for record

**Homepage:**
- Providers section: "List your activity →" → `/providers/signup` (until 2026-10-16 this actually pointed at the family waitlist `/#waitlist` — see Bugs found + fixed #4), plus an "Already listed? Claim your listing" mailto link to hello@. (This line previously described three buttons that didn't match the code.)

### Family auth (fully complete — Option B, full signup)

**Decision:** Full family accounts via Supabase Auth (email + password), not waitlist-only. Rationale: 80+ providers already catalogued is enough inventory to make an account valuable, and this is infrastructure the platform needs at launch regardless.

**End-to-end flow:**
Family visits `/families/signup` → 2-step form (account: name/email/password → profile: neighborhood, kids' ages, interests) → `POST /api/families/signup` creates the Supabase Auth user and a `profiles` row → if email confirmation is off, they land straight in `/families/dashboard`; if it's on, they see a "check your email" screen, then sign in at `/families/login` → `/families/dashboard` is session-protected by `middleware.ts`.

**New files:**
| File | Route | Purpose |
|------|-------|---------|
| `app/families/signup/page.tsx` | `/families/signup` | 2-step family signup (account → profile) |
| `app/families/login/page.tsx` | `/families/login` | Email + password sign in |
| `app/families/dashboard/page.tsx` | `/families/dashboard` | Server component, session-gated, loads profile |
| `app/families/dashboard/DashboardClient.tsx` | — | Client component: view/edit profile, sign out |
| `app/api/families/signup/route.ts` | `POST /api/families/signup` | Creates auth user (cookie-aware) + profile row (service role) |
| `lib/supabase-browser.ts` | — | `@supabase/ssr` browser client (cookie-backed, for client components) |
| `lib/supabase-server.ts` | — | `@supabase/ssr` server client (for server components / route handlers) |
| `middleware.ts` | — | Refreshes session cookie; gates `/families/dashboard`; bounces logged-in users off `/families/login` + `/families/signup` |
| `supabase/family-profiles.sql` | — | Creates `profiles` table + RLS policies |

**Infrastructure:**
- `profiles` table (see `supabase/family-profiles.sql`): id (references `auth.users`), first_name, last_name, email, neighborhood, kids (jsonb array of `{age}`), preferences (text[]), created_at, updated_at
- RLS: families can select/update their own row only; row creation happens server-side via `supabaseAdmin` (service role), so no insert policy needed
- Nav has a "Sign In" link (desktop) / "Family Sign In" link (mobile) pointing to `/families/login`

**Status: ✅ done and verified live 2026-08-03.** `family-profiles.sql` run, `@supabase/ssr` installed, "Confirm email" is ON in Supabase Auth settings (new families see a "check your email" screen, not an instant dashboard landing).

### Site-wide password gate (fully complete)

**Why:** Real family/provider signups aren't live yet — the "100+ families," "57+ providers verified" language across the site is aspirational, not real. Rather than show fabricated or embarrassingly-low real numbers while still building, the whole site is now gated behind a shared password until there's real traction worth launching publicly with.

**How it works:** `middleware.ts` now runs on nearly every request (pages, API routes, everything except Next's static assets). It checks for a `ls_site_access` cookie matching `SITE_ACCESS_PASSWORD`; if missing or wrong, it redirects to `/unlock`, a simple password form that POSTs to `/api/site-gate` and sets an HttpOnly cookie on success (30-day expiry). If `SITE_ACCESS_PASSWORD` isn't set in production, the site fails closed (blocks everyone, including us) rather than leaking open.

**Status: ✅ done and verified live 2026-08-03.** `SITE_ACCESS_PASSWORD` set in Vercel, unlock flow tested and working. Locally, `npm run dev` falls back to a hardcoded dev password (`dev-preview`) so the env var doesn't need to be set to test on your machine.

**To go public again later:** remove or rename `SITE_ACCESS_PASSWORD` handling in `middleware.ts` (or just stop requiring it) once there's real traction.

### Admin panel real auth (fully complete)

**What changed:** `/admin` no longer uses a single shared password stored in a client-exposed `NEXT_PUBLIC_ADMIN_PASSWORD` env var. It's now real Supabase Auth (same system as families), gated by a dedicated `admin_users` allowlist table — being logged in isn't enough, your `auth.users` id also has to be listed in `admin_users`.

**End-to-end flow:**
Admin visits `/admin` → `middleware.ts` checks for a session + `admin_users` membership → if either is missing, redirect to `/admin/login` → email + password sign in → back to `/admin`, session-protected the same way `/families/dashboard` is.

**New/changed files:**
| File | Purpose |
|------|---------|
| `app/admin/login/page.tsx` | Admin sign in |
| `app/admin/page.tsx` | Server component — verifies session + `admin_users` membership, redirects if not, renders `AdminClient` |
| `app/admin/AdminClient.tsx` | The actual panel UI (moved out of `page.tsx`, password gate removed, sign-out button added) |
| `lib/admin-auth.ts` | `requireAdmin()` — used by the API routes below |
| `app/api/admin/submissions/route.ts` | Now calls `requireAdmin()` and returns 401 if not an admin (previously had **no server-side check at all**) |
| `app/api/admin/submissions/[id]/status/route.ts` | Same — now requires admin. Also **removed the unused `DELETE` handler** (contradicted the documented "no delete, only reject" policy and was unnecessary attack surface) |
| `middleware.ts` | Extended to also gate `/admin/*` (same pattern as `/families/dashboard`, checked via the service-role client against `admin_users`) |
| `supabase/admin-users.sql` | Creates `admin_users` table (no client-facing RLS policies at all; service-role only) |

**Why this mattered:** the old admin panel's password check was purely a client-side UI gate — the actual API routes (`GET /api/admin/submissions`, `POST /api/admin/submissions/[id]/status`) had zero auth check of their own, so anyone who found those URLs could read every submission's contact info or approve/reject listings directly, completely bypassing the password screen. That's fixed now — both the page and the underlying API routes independently require real admin auth.

**Status: ✅ done and verified live 2026-08-03.** Evan + Kelly both added as admin users (Supabase Auth accounts + `admin_users` rows), tested sign-in at `/admin/login` successfully. Old `NEXT_PUBLIC_ADMIN_PASSWORD` env var in Vercel is no longer used by the code — safe to remove whenever, not urgent.

### Family password recovery (fully complete)

**Why:** signup and login existed, but there was no way to recover a forgotten password — a family would be permanently locked out. This closes that gap.

**End-to-end flow:**
Family clicks "Forgot password?" on `/families/login` → `/families/forgot-password` → enters email → `supabase.auth.resetPasswordForEmail()` sends a reset link (same success message shown whether or not the email has an account, so the flow doesn't leak which emails are registered) → family clicks the emailed link → lands on `/families/reset-password` → Supabase's client SDK detects the recovery tokens in the URL and fires a `PASSWORD_RECOVERY` auth event, which unlocks the "set new password" form → `supabase.auth.updateUser({ password })` → redirected into `/families/dashboard`, already signed in.

**New files:**
| File | Route | Purpose |
|------|-------|---------|
| `app/families/forgot-password/page.tsx` | `/families/forgot-password` | Request a reset link by email |
| `app/families/reset-password/page.tsx` | `/families/reset-password` | Landing page for the emailed link; sets new password |

**Changed files:**
- `app/families/login/page.tsx` — added a "Forgot password?" link under the password field

**Note:** while the site is password-gated (see Site-wide password gate section), this flow only works for people who already know the site-wide password, since `middleware.ts` gates `/families/reset-password` like everything else. Not an issue during private beta testing; resolves itself once the site goes public.

### Branded auth emails (fully complete)

**Status: ✅ done and verified live 2026-08-03.** Custom SMTP configured via Brevo (dedicated "Supabase Auth" key), both templates pasted in and confirmed working — reset password email arrives branded as Little Sound from hello@thelittlesound.com.

**Why:** Supabase's default auth emails (signup confirmation, password reset) are generic — no Little Sound branding, and the sender address doesn't look like it's from us. Evan flagged this after receiving a plain "Supabase Auth" reset email.

**What this took:** two separate fixes — email content (templates in `supabase/email-templates/confirm-signup.html` and `reset-password.html`, pasted into Supabase's Email Templates screen) and sender address (custom SMTP via Brevo's SMTP relay, using a dedicated "Supabase Auth" key, entered under Authentication → Settings → SMTP Settings with Sender email `hello@thelittlesound.com`). The SMTP change also fixed the rate-limit issue hit during testing — Supabase's default built-in email service allows only a handful of emails/hour, fine for testing but not for real families.

### Provider authentication (fully complete)

**What changed:** provider signup used to only write a row to `submissions` — no real account was ever created, so providers could never log back in, view their listing's status, or submit a second listing without emailing hello@. Now providers have full accounts, mirroring the family auth pattern.

**Bug found + fixed along the way:** the old flow actually created **two** `submissions` rows per provider — one mostly-empty row from the signup form, and a second complete one from the listing form. Both `type: 'signup'` and `type: 'listing'` POSTs to `/api/providers/submit` inserted into `submissions` regardless of type. Account creation no longer touches `submissions` at all, so this is fixed as a side effect.

**End-to-end flow:**
Provider visits `/providers/signup` → fills out account + business info (now including a password) → `POST /api/providers/signup` creates the Supabase Auth user + a `provider_profiles` row + Brevo contact + notifies hello@ → if auto-confirmed, straight to `/providers/listings/new`; otherwise a "check your email" screen, then `/providers/login` → `/providers/listings/new` (now session-protected, pulls contact info from their profile instead of URL params) → submitting a listing calls `POST /api/providers/submit`, which requires a logged-in provider and tags the row with `provider_id` → `/providers/dashboard` shows all their listings with live status (pending / live on Discover / not approved, with admin notes if rejected).

**New files:**
| File | Route | Purpose |
|------|-------|---------|
| `app/providers/login/page.tsx` | `/providers/login` | Email + password sign in |
| `app/providers/forgot-password/page.tsx` | `/providers/forgot-password` | Request password reset |
| `app/providers/reset-password/page.tsx` | `/providers/reset-password` | Set new password |
| `app/providers/dashboard/page.tsx` | `/providers/dashboard` | Server component — session-gated, loads profile + listings |
| `app/providers/dashboard/ProviderDashboardClient.tsx` | — | Listings list with status, sign out |
| `app/providers/listings/new/ListingForm.tsx` | — | The 4-step wizard UI (moved out of `page.tsx`, now takes contact info as props instead of URL params) |
| `app/api/providers/signup/route.ts` | `POST /api/providers/signup` | Creates auth user + `provider_profiles` row + Brevo contact + hello@ notification |
| `lib/provider-auth.ts` | — | `requireProvider()` — used by `/api/providers/submit` |
| `supabase/provider-profiles.sql` | — | Creates `provider_profiles` table + adds `provider_id` column to `submissions` |

**Changed files:**
- `app/providers/signup/page.tsx` — added password/confirm-password fields, now posts to `/api/providers/signup` instead of `/api/providers/submit`, "check your email" screen added, footer link now points to `/providers/login`
- `app/providers/listings/new/page.tsx` — now a server component: requires login, redirects to `/providers/login` if not signed in, fetches the provider's profile and passes it to `ListingForm`
- `app/api/providers/submit/route.ts` — now listing-only (the dead `type: 'signup'` branch and `buildSignupEmail` are gone), requires `requireProvider()`, tags each row with `provider_id`
- `middleware.ts` — restructured family + provider route protection into a shared `PORTALS` list (same "protect the dashboard, bounce logged-in users off login/signup" pattern for both)

**Infrastructure:**
- `provider_profiles` table: id (references `auth.users`), first_name, last_name, email, business_name, category, website, phone, timestamps — same RLS pattern as `profiles` (select/update own row only, insert via service role)
- `submissions.provider_id` — new nullable column linking a listing to the provider who submitted it; existing pre-auth rows just have it as null

**Status: ✅ done and verified live 2026-08-03.** `provider-profiles.sql` run, full flow tested end to end (signup → email confirm → login → create listing → shows "In review" on dashboard → approved in `/admin` → dashboard updates to "Live on Discover"). Two real bugs were caught and fixed during this testing pass — see "Bugs found + fixed" below.

**~~Not built yet: editing an already-submitted listing.~~** ✅ Built 2026-08-23 — providers can now self-serve edit their listings. See "Provider listing editing" below.

### Date agent: finds dates automatically (built + deployed 2026-11-14; first run done)

**What it does:** for each listing, it does the following:
1. Fetches the listing's website and picks up to 3 same-site pages that look like schedule/camp/registration pages (link words like camp, schedule, class, register; skips about/blog/shop, outside sites, and PDFs).
2. Sends their text to Claude, which returns this listing's sessions and registration windows, each with an exact quote from the page, plus **other kids' programs** it saw.
3. **Verifies** every date's quote is really on the page (tolerant of dash, quote, and spacing differences). Past dates are dropped.
4. Decides:

| Situation | What happens |
|---|---|
| Same dates as what's live | Nothing (no churn) |
| All quotes verified, no doubts | **Published automatically** (tagged `approved_by = agent`) |
| A quote isn't on the page | Inbox |
| Year not stated, date >90 days out (could be last year's schedule) | Inbox |
| AI raised a real doubt (TBA, conflicting dates, date may belong to another program) | Inbox. **FYI notes** (no registration dates, signup by email, undated sessions) don't hold anything back; they show next to the published dates. |
| Live dates were typed by hand in the Dates tab | Inbox. **Hand edits are never overwritten.** |
| Dates disappeared from the site | Inbox (keep or clear) |
| No dates, none live | Recorded as "no dates on site" |

5. Saves other programs as **suggested listings** (one per business+title, never re-suggested after dismissal, skipped if already a listing). **Add listing** creates an approved, unowned listing on Discover with its dates. Providers can claim it later through the normal claim flow.
6. Records a fingerprint of the page text, so **unchanged sites skip the AI** on later checks (cheap, fast).

**Where you see it:** `/admin` → **Agent**: counts, **Check unchecked listings** / **Re-check all** (runs 2 at a time from your browser with live progress; keep the tab open), the review inbox (Approve & publish / Dismiss), suggested listings (Add / Dismiss), the "couldn't read" list (the only ones needing the Dates-tab paste box), and every listing's last status with **Check now**.

**Runs itself:** Vercel Cron calls `/api/cron/date-agent` daily at 13:15 UTC (5:15am Seattle in winter, 6:15am in summer). Each run checks the listings checked longest ago until ~15 seconds have passed: unchanged sites take a few seconds, a changed one up to ~45s. So the catalog cycles every few days on the free plan. More frequent checks would need Vercel Pro.

**Safety and politeness:**
- Identifies itself as `LittleSoundBot/1.0` with a contact address, and honors robots.txt.
- Fetches only public http(s) addresses on standard ports and re-checks every redirect. Provider-typed websites can't make it fetch internal addresses (localhost, private ranges, cloud metadata).
- Page text is treated as untrusted data in the AI prompt.
- `/api/cron` is exempt from the site password (Vercel's scheduler can't type it) and instead requires `Authorization: Bearer <CRON_SECRET>`; without the secret it refuses to run.

**Dates approved from the inbox** are tagged `agent·<your email>` and stay agent-managed, so future site changes can still auto-publish. Dates typed in the Dates tab are tagged with your plain email and are protected.

**New files:** `supabase/date-agent.sql` (`listing_sources`, `date_drafts`, `suggested_listings`), `lib/fetch-page.ts`, `lib/date-agent-logic.ts` (pure rules), `lib/date-agent.ts`, `app/api/admin/agent/route.ts` + `check/` + `drafts/[id]/` + `suggestions/[id]/`, `app/api/cron/date-agent/route.ts`, `vercel.json`, `app/admin/AgentPanel.tsx`.
**Changed:** `lib/extract-dates.ts` (several pages at once, `other_programs`, per-item `year_inferred`, stricter exact-quote instruction), `lib/activity-dates-server.ts` (listings carry neighborhood), `app/api/admin/dates/extract/route.ts`, `app/admin/AdminClient.tsx` (Agent tab), `middleware.ts` (`/api/cron` exempt from the site password).

**Deploy steps, in order:**
1. Run `supabase/date-agent.sql` in Supabase (paste the file's contents).
2. In Vercel, add `CRON_SECRET`: any long random text, e.g. 40+ characters from a password generator. Production environment. Without it, the daily run stays off; the Agent tab still works.
3. Push. Then `/admin` → Agent → **Check unchecked listings**.

**First live run (2026-11-14), after three fixes:** 79/79 checked → 1 published, 13 in the review inbox, **50 suggested new listings**, 13 couldn't read. The fixes (also in Bugs found #11–13): Claude 5 models reject a forced tool choice; robots.txt wildcards wrongly blocked every Squarespace site; FYI notes were treated as doubts. A **Retry couldn't-read** button was added.

**The 13 it can't read:**
- **Block bots (paste once in the Dates tab, or skip):** Woodland Park Zoo ×2 (403), School of Rock (403), International Montessori ×2 (403), Westlake Dance (robots.txt), Studio-Kids (JavaScript-only site).
- **Bad website addresses in our data** (these also send Discover visitors to dead links):
  - Broadway Bound: `broadwayboundseattle.org` doesn't exist; real site appears to be `broadwaybound.org`.
  - Discovery Park Nature Trek: Seattle Parks moved pages (404); e.g. `seattle.gov/parks/allparks/discovery-park/discovery-park-visitor-center`.
  - Itty Bitty Camps (`ittybittycamps.com`), Evergreen Rhythmics (`evergreenrhythmics.com`; also listed in **Kent**, not Seattle), Junior Sous Chef (`juniorsouschef.com`), Blue Ridge Pool (`blueridgepool.org`): domains gone. Possibly closed. Confirm before launch.

**Booking-system widgets (built 2026-11-14):** many providers keep their schedule in an embedded booking widget (Jackrabbit, iClassPro, Sawyer, ActiveNet, Daxko/YMCA, Amilia, Mindbody, Pike13, CampMinder, GoMotion… ~40 systems in `lib/booking-widgets.ts`). The page around it reads fine, so the agent used to report "no dates". Now it collects `<iframe>`/`<script>` sources and links on the provider's pages, spots known systems, and reads up to 2 of their public pages per listing (same URL-safety and robots.txt rules). Jackrabbit's JavaScript table (`…/Openings/OpeningsJS?OrgID=…`, legacy `Openings.asp?id=`, and `regv2.asp?id=` links) is switched to its plain-HTML twin `…/Openings/OpeningsDirect?OrgID=…` (Jackrabbit's documented "Direct Method"). If a system is found but can't be read (needs JavaScript too, or blocked) and no dates turn up elsewhere, the listing moves to **Couldn't read** with the system named, e.g. "Its schedule seems to be in iClassPro… Paste it in the Dates tab." Other programs in a widget's table become suggestions as usual. Possible next step if many listings name the same system: a dedicated reader for that system's public data. 101 agent checks pass.

**Earlier status: built; typecheck clean; 148 logic checks pass** (67 for the agent, 57 dates, 24 claims). The agent checks cover: URL safety (13 blocked address patterns), robots rules, HTML→text, schedule-link picking, quote verification, every decision rule, and full runs against a simulated skatepark site + AI + database (publish, unchanged-skip, no duplicate suggestions, unverified→inbox, one draft per listing, hand-edit protection, AI-failure retry, robots refusal, metadata-address refusal, JavaScript-only site, no website). The sandbox can't reach the internet, so the first real run in the Agent tab is the live test.

### Calendar agent Phase 1, Step A: activity dates (built 2026-11-11, pending migration + API key + deploy)

**What it does:** gives listings real dates. In `/admin` → **Dates**, pick a listing (the list shows coverage, e.g. "12 of 79 listings have dates", and filters to ones still needing dates), open the provider's site, paste their schedule text, and click **Extract dates with AI**. Claude drafts **sessions** (date range, weekly days, times) and **registration windows** (opens/closes), each with the exact quote it came from plus any warnings to double-check. You fix anything wrong, add or remove rows by hand, and **Save**. Families then see one line per listing on Discover cards and their saved activities, e.g. "Registration opens Mar 3 at 9am", "Registration open · closes Apr 1", "Next session starts Jun 21", or "Running now · Tue, Thu".

**How it's built:**
- `activity_dates` table, keyed by Discover id. A claimed seed keeps its id, so its dates carry over. All dates and times are **Seattle wall-clock** values (no UTC conversion), so the calendar feed in Step B can attach the time zone explicitly.
- Saving replaces a listing's dates inside one Postgres function, `replace_activity_dates()`, so a failed save can't leave a listing half-updated. The function is locked to the server key (new functions are callable by anyone over Supabase's API by default).
- AI extraction (`lib/extract-dates.ts`) calls the Anthropic API with a forced tool, so the output is always structured data. The pasted page is treated as untrusted data, and extraction never saves anything: the result is only a draft until a person saves it. Each AI item is validated; bad ones are dropped with a warning. Up to 50,000 characters per paste; 60-second limit.
- The card line prefers registration over sessions (it's the time-sensitive one) and ignores past dates. "Today" is computed in Seattle time.
- **Ongoing weekly classes** ("Sundays 12–1pm", no start/end date) are allowed as sessions with weekdays and no dates (added 2026-11-14, after the first real page, All Together Skatepark, showed most classes are listed this way). Their card line reads "Weekly · Sun 12pm" and ranks below registration and dated sessions. The AI is told to skip general open hours and past dates, and to name other dated kids' programs it skipped on the page (e.g. a camp) so you can decide whether they deserve their own listing.
- The `/admin` page now clears the site's fixed top nav, which used to cover the admin header.
- Dates are never parsed with `new Date('YYYY-MM-DD')`, which reads them as UTC midnight and shows them a day early in Seattle.

**New files:** `supabase/activity-dates.sql`, `lib/activity-dates.ts` (pure: summaries, formatting, validation; safe in the browser), `lib/activity-dates-server.ts`, `lib/extract-dates.ts`, `app/api/admin/dates/route.ts` (listings + coverage), `app/api/admin/dates/extract/route.ts`, `app/api/admin/dates/[activityId]/route.ts` (GET/PUT), `app/admin/DatesPanel.tsx`.
**Changed:** `app/admin/AdminClient.tsx` (Dates tab), `app/api/activities/route.ts` (`dateLines`), `app/discover/page.tsx` (date pill on cards), `app/families/dashboard/page.tsx` + `DashboardClient.tsx` (date pill on saved activities).

**Deploy steps, in order:**
1. Run `supabase/activity-dates.sql` in the Supabase SQL editor (paste the file's *contents*). Run it before pushing.
2. Create an API key in the Claude Console at **platform.claude.com** (Settings → API keys). The same login as claude.ai works, but API usage is billed separately: Max/Ultra/Team plans include monthly API credits once linked via claude.ai → Settings → Billing → API credits; otherwise buy credits in the Console. Then in Vercel → Settings → Environment Variables add `ANTHROPIC_API_KEY`. The default model is `claude-sonnet-5-5` (changed 2026-11-14 from `claude-sonnet-4-5`, which retires 2026-11-30). Set `ANTHROPIC_MODEL` to override it, e.g. `claude-haiku-5-5` for cheaper. **Check the key's expiry date**: when it expires, the AI button stops working until a new key is set. Then redeploy. Without the key, the Dates tab still works for entering dates by hand; only the AI button is disabled.
3. Push.

**Status: ⏳ built; typecheck clean; 48 logic checks pass.** The checks cover Seattle-vs-UTC "today", card summaries, formatting, validation, and extraction against a fake Anthropic API (success, bad AI items dropped, missing key, 401/404/429/529/500, timeout, oversized input). Not yet deployed. First live test: Dates tab → pick a listing → paste its schedule → extract → save → the date line appears on its Discover card.

### Sitemap + robots (fully complete)

- `app/sitemap.ts` → `/sitemap.xml`: the 7 public pages (home, Discover, For Families, For Providers, About, Privacy, Terms). Leaves out sign-in/sign-up, dashboards, the claim flow, `/admin`, `/api`, and `/unlock`. No `lastModified`, because the pages don't track edit dates.
- `app/robots.ts` now includes a `Sitemap:` line pointing at it.
- `lib/site.ts`: a single `SITE_URL` constant (`https://www.thelittlesound.com`) used by both. If the canonical domain changes, change it there.
- While the password gate is up, crawlers hit `/unlock` like everyone else, so none of this takes effect until launch.

**Status: ✅ done, deployed, and verified live** (confirmed by Evan 2026-11-11). Pushed as commits 0fe9528/1a9d2c7. `/robots.txt` ends with `Sitemap: https://www.thelittlesound.com/sitemap.xml`, and `/sitemap.xml` lists all 7 pages on the `www` host. Search engines can't reach either file until the password gate is removed.

### Provider listing claims (deployed; live claim test skipped)

**What it does:** a provider can take ownership of a listing that's already on Little Sound (one of our researched seed listings, or a pre-account `submissions` row), after Kelly/Evan verify them. Once approved, the listing is on their dashboard and editable via the #2 edit flow. This is what the outreach line "your listing is already live — help us get the details right" now links to.

**End-to-end flow:**
Provider opens a claim link (`/providers/claim/42`, e.g. from outreach) or searches at `/providers/claim` → if signed out, sign in or sign up, and the claim page is carried through login, signup, and email confirmation so they land back on it → picks their listing(s) (all of a business's unowned listings are offered as checkboxes — YMCA claims its 5 in one request) + role + optional verification note → pending `listing_claims` row, hello@ emailed → admin reviews in `/admin` → **Claims** tab (claimant, listings, note, and hints: email domain matches listing website? profile website matches?) → **Approve & transfer** or **Reject** (with an optional note that goes into the email to the provider) → provider emailed either way.

**What approval does:**
- **Seed listing** → copied into `submissions` (`status = approved`, `seed_id` = original id, owned by the claimant, contact fields from their profile, category mapped to the form's category where one exists).
- **Pre-account submission** → `provider_id` set, via a conditional update that only succeeds while it's still null.
- Ownership is re-checked at approval time; a listing that's since been claimed by someone else blocks approval with a clear message. Listings already transferred to this claimant are skipped, so retrying a partly-failed approval is safe.

**Discover:** an imported listing keeps its original Discover id ("42"), so the provider's version replaces the seed card in place and families' saved hearts keep matching. `/api/activities` returns `claimedSeedIds` (every imported seed, any status), and Discover hides those static entries — so even if an imported listing is later rejected, the old seed card never resurfaces as unclaimed. Discover's provider section gets an "Already listed? Claim your listing" link (decided 2026-10-27: no per-card claim links, keep Discover family-facing).

**Safeguards:**
- Only accounts with a `provider_profiles` row can claim — a family account can't take a business's listing.
- Can't claim a listing that's already owned; can't file a second pending claim for the same listing.
- `submissions.seed_id` has a unique index, so a seed can't be imported twice even if two approvals race.
- `listing_claims` has RLS on with no client policies — service-role only, like `submissions`.

**New files:**
| File | Purpose |
|------|---------|
| `supabase/listing-claims.sql` | `listing_claims` table + `submissions.seed_id` (unique). **Run before pushing.** |
| `lib/claimable.ts` | Server-only: claimable listings, ownership resolution, seed→submission mapping, verification hints |
| `lib/claim-roles.ts` | Role options shared by the form and API |
| `lib/safe-next.ts` | Same-site-only `?next=` redirects (see bug #10) |
| `lib/notify.ts` | Shared Brevo email helper + escaping (used by the claim routes) |
| `app/providers/claim/page.tsx`, `[activityId]/page.tsx`, `ClaimClient.tsx`, `loadClaimContext.ts` | Claim search + direct claim link UI |
| `app/api/providers/claims/route.ts` | `POST` — create a claim request |
| `app/api/admin/claims/route.ts` | `GET` — admin review queue |
| `app/api/admin/claims/[id]/route.ts` | `POST` — approve (transfer) / reject |
| `app/admin/ClaimsPanel.tsx` | Claims tab UI in `/admin` |

**Changed files:** `app/admin/AdminClient.tsx` (Listings / Claims tabs), `app/api/activities/route.ts` (seed ids, `claimedSeedIds`, business names, `force-dynamic`), `app/discover/page.tsx` (hide claimed seeds, memo fix, claim link), `app/providers/dashboard/*` (claim button, claim request statuses, "Claimed" label), `app/providers/listings/new/ListingForm.tsx` (keeps categories/price units outside its option lists — 17 seed listings use Martial Arts / Early Childhood / Cooking / Language, a few use hour / lesson / quarter), `app/providers/login/page.tsx` + `signup/page.tsx` + `app/api/providers/signup/route.ts` + `middleware.ts` (carry `?next=` through sign-in, sign-up and email confirmation; `/providers/claim` protected), `app/families/login/page.tsx` + `app/unlock/page.tsx` (safe `next`), `app/components/Providers.tsx` + `app/for-providers/page.tsx` (claim buttons → `/providers/claim` instead of mailto).

**Deploy steps, in order:**
1. Run `supabase/listing-claims.sql` in the Supabase SQL editor. (Code first would blank provider dashboards — they now select `seed_id` — and break claiming.)
2. Supabase → Authentication → URL Configuration → **Redirect URLs**: add `https://www.thelittlesound.com/**` (and `https://thelittlesound.com/**` if the bare domain is used). Without it, confirmation emails fall back to the Site URL and new providers have to find their way back to the claim page.
3. Push.

**Status: ✅ deployed 2026-11 (commit 2e71587; `listing-claims.sql` run in Supabase) — ⚠️ end-to-end live test deliberately skipped.** Evan chose not to run the full flow, because approving a test claim would make a test account the real owner of a seed listing. Pre-deploy verification: typecheck plus 24 logic checks in the sandbox (ownership rules, redirect safety, all 79 seed categories round-trip through import → Discover). **Before the first real outreach claim, do a safe partial test:** submit a claim from a test provider account, then **Reject** it in `/admin` → Claims. That exercises everything except the ownership transfer. Also confirm deploy step 2 (Supabase redirect URL) was done.

### Homepage account CTAs (fully complete)

**What changed:** the homepage only ever pushed the waitlist. It now leads with account creation, mirroring `/for-families` (decided with Evan 2026-10-16).

- **Hero** (`app/components/Hero.tsx`): the inline waitlist email form is replaced by a gold **Create Your Account →** button (`/families/signup`) + a **Browse Activities** button (`/discover`), with a "Not ready yet? *Join the waitlist* instead" fallback that scrolls to the closing form. Same markup pattern as the `/for-families` hero. Hero no longer holds form state, so it's no longer a client component. Rationale: while the site is password-gated, anyone who sees it can already use the product — an account fits them better than a waitlist.
- **Closing CTA** (`app/components/CTA.tsx`): now carries `id="waitlist"` (see bug #5), its form stacks on mobile instead of squeezing input + button into one row (it's now the only waitlist form), and it adds a "Ready now? Create your account →" link.
- **Nav** (`app/components/Nav.tsx`): the site-wide gold "Join Waitlist" button (desktop + mobile) is now **Create Account** → `/families/signup`. "Sign In" unchanged.
- **Provider CTAs**: "List your activity" on the homepage Providers section and the Discover footer now go to `/providers/signup` instead of the family waitlist (see bug #4).

**Known quirk (pre-existing, not changed):** middleware treats *any* signed-in user as a family on `/families/login` + `/families/signup`, so a signed-in provider or admin who clicks "Create Account" is bounced to `/families/dashboard` (an empty family profile). Same thing already happened with "Sign In." Worth fixing if providers start using the main nav while signed in.

**Status: ✅ done, deployed, and verified live** (confirmed by Evan 2026-10-27). Pushed as commit 917053a; no migration. Checked on the live site: hero shows Create Your Account + Browse Activities with the waitlist fallback, "Join the waitlist" scrolls to the closing form, nav shows Create Account, and both "List your activity" links land on provider signup.

### Provider listing editing (fully complete)

**What changed:** providers can now edit their own listings from the dashboard — previously create-only, with "email hello@ for changes." The 4-step listing wizard (`ListingForm`) was made edit-aware and reused; no duplicate form.

**How edits interact with review (agreed with Evan 2026-08-23):**
- **pending** listing edited → stays pending.
- **rejected** listing edited → resubmitted as pending; the stale rejection note is cleared.
- **approved** (live) listing edited → **stays live on Discover** (status stays `approved`) but is **flagged for re-approval** (`reapproval_needed=true`) and hello@ is notified. The flag is deliberately separate from `status`: flipping status back to pending would pull the live listing off Discover, which we didn't want. The team clears the flag with **Approve changes** in `/admin` (any review action — approve or reject — clears it).

**New files:**
| File | Route | Purpose |
|------|-------|---------|
| `app/providers/listings/[id]/edit/page.tsx` | `/providers/listings/[id]/edit` | Server component, `force-dynamic`, auth + **ownership check** (redirects unless the listing's `provider_id` is the logged-in user); seeds `ListingForm` in edit mode |
| `app/api/providers/listings/[id]/route.ts` | `PATCH /api/providers/listings/[id]` | Update route: `requireProvider()` + ownership check; updates content fields only (never contact/account); status transition + re-approval flag; notifies hello@ when the team needs to act |
| `supabase/listing-reapproval.sql` | — | Adds `reapproval_needed` + `edited_at` to `submissions`. **Run once in Supabase before this works in prod.** |

**Changed files:**
- `app/providers/listings/new/ListingForm.tsx` — new optional `mode` / `listingId` / `initial` / `currentStatus` props; edit mode prefills every field, PATCHes the update endpoint, and shows an edit-specific review note + success screen. Create mode unchanged.
- `app/providers/dashboard/page.tsx` + `ProviderDashboardClient.tsx` — "Edit →" on every listing card; "Changes pending review" badge on an approved listing with a pending edit; loads `reapproval_needed` / `edited_at`; softened the "email hello@" footer.
- `app/admin/AdminClient.tsx` — "✎ edited" flag in the list, a re-approval banner + "Approve changes" button in the detail panel.
- `app/api/admin/submissions/[id]/status/route.ts` — every review action also clears `reapproval_needed`.
- `middleware.ts` — provider `protectedRoutes` broadened from `/providers/listings/new` to `/providers/listings`, so the edit route is session-gated too.

**Security:** the edit page and the PATCH API both independently verify the listing's `provider_id` matches the logged-in user — a provider can't open or update someone else's listing by guessing an id (same defense-in-depth pattern as the admin routes).

**Status: ✅ done, deployed, and verified live** (confirmed by Evan 2026-10-16). `listing-reapproval.sql` run in Supabase; pushed (commit baf3696). Edit + re-approval flow tested live.

**Deploy-order note for future migrations:** this feature's code reads/writes the new columns in pre-existing paths (the admin status route always writes `reapproval_needed`; the provider dashboard selects it), so deploying the code *before* running the SQL would have broken admin approve/reject and blanked provider dashboards — not just editing. Rule going forward: **run the migration first, then push.**

### Family dashboard — saved activities (fully complete)

**What changed:** the family dashboard's "saved activities and booking history are coming soon" placeholder is replaced with a real **Saved Activities** feature. Families heart an activity on `/discover`; it appears on their dashboard, where they can open it or remove it. **Booking history** stays a deliberate placeholder (booking is out of Phase 1 scope — see Open Decisions), now worded honestly instead of implying a feature exists.

**End-to-end flow:**
Family browses `/discover` → taps the heart on any activity card (logged-out visitors are sent to `/families/login?next=/discover`) → a row is written to `saved_activities` straight from the browser (anon client, RLS-scoped) → `/families/dashboard` reads their saved rows server-side and lists them → Remove deletes the row and refreshes.

**New files:**
| File | Purpose |
|------|---------|
| `supabase/saved-activities.sql` | Creates `saved_activities` table + RLS (select/insert/delete own rows). **Run once in the Supabase SQL editor before this works in prod.** |

**Changed files:**
- `app/discover/page.tsx` — heart button on each activity card; loads the current user + their saved ids on mount; optimistic save/unsave via the browser Supabase client
- `app/families/dashboard/page.tsx` — also loads the user's `saved_activities` (RLS-scoped) and passes them to the client
- `app/families/dashboard/DashboardClient.tsx` — new Saved Activities section (list, View details, Remove) + honest Booking history placeholder; replaces the old combined "coming soon" block

**Infrastructure:**
- `saved_activities` table: composite PK `(user_id, activity_id)`; `user_id` → `auth.users(id) on delete cascade`; `activity_id` matches the Discover `Activity.id` (`"1".."79"` seed, `"sub_<uuid>"` provider); plus a **snapshot** of the card's display fields (title, provider, category, neighborhood, age_min/max, price, price_unit, website) captured at save time
- RLS: **client-facing** select/insert/delete policies scoped to `auth.uid() = user_id` — unlike `profiles` / `provider_profiles` (service-role created), families write their own rows here, so RLS is the security boundary

**Design decisions:**
- **Snapshot, not join.** The dashboard is a server component and can't cheaply re-resolve an id against the live catalog (seed JSON is bundled into the client; provider listings come from an API). Snapshotting the card fields into the saved row means the dashboard just reads and renders, and a saved card survives the seed data being reordered or a provider editing their listing. Trade-off: a saved card shows details as they were when saved, not live.
- **Client-side writes + RLS**, matching how the dashboard already edits `profiles` directly — no new API route.
- Kept `export const dynamic = 'force-dynamic'` on the dashboard; unsave uses `router.refresh()` (no post-mutation cross-page navigation, so the plain-`<a>` rule isn't triggered here).

**Status: ✅ done, deployed, and verified live 2026-08-23.** `saved-activities.sql` run in Supabase; pushed (commit 5310149) and auto-deployed via Vercel. Full flow tested on the live site: heart an activity on Discover → persists across refresh → appears on `/families/dashboard` → Remove works; logged-out heart routes to `/families/login?next=/discover`.

**Not built (out of scope for this pass):** booking history (no booking system yet), sharing saved lists, saved-count badges elsewhere in the UI, re-syncing a snapshot if the underlying listing changes.

### Previous work
- Data verification pass on top 15 listings
- Static pages: `/for-families`, `/for-providers`, `/about`
- Site-wide nav (`app/components/Nav.tsx`) — fixed top, mobile hamburger; links: Browse Activities, For Families, For Providers
- Homepage flow: Hero → Problem → Solution → Categories → Founders → Providers → CTA

---

## Next Up

The 2026-08-23 list (family saved activities, provider listing editing, homepage account CTA, sitemap, listing claims) is **complete**; see Completed Work.

New priorities (agreed with Evan 2026-11-11), tackle top-down:

1. **Calendar agent, Phase 1 Step B:** each family's private calendar subscription link (works with Google/Apple/Outlook), "Add to my calendar" on a saved activity's sessions, and email alerts through Brevo: registration opening (a week before and the morning of) plus a change notice when updated dates are approved for something they saved. Design in "Calendar agent — roadmap" below.
2. **Finish the date agent's first pass:** approve/dismiss the 13 drafts in the review inbox (one-time; they were held under the old rule where any AI note blocked publishing), and fix or remove the stale website addresses listed under the date agent in Completed Work. After that it re-checks every site daily on its own.
3. **Calendar agent, Phase 2:** weekly family digest email; kids' names on profiles so calendar items belong to a specific kid.
4. **Calendar agent, Phase 3:** text alerts, scheduling help, and direct Google Calendar connect. Start the slow external approvals early (Twilio/10DLC registration, Google app verification).
5. **Automate new listings** (**parked by Evan 2026-11-14 until the calendar agent work is done**). Today the date agent spots other programs on sites it already reads and saves them as Suggestions (50 on the first run). They go live with **Add** (one) or **Add all N** (every pending suggestion at once, with a confirm step; built 2026-11-14 — each Add claims its suggestion first, so nothing is ever added twice). Open questions with Claude's suggested defaults, not yet decided:
   - *Going live without a click:* auto-add when solid (kids' program, in the service area, working site, ages + category, not a duplicate) with a daily "added" list and undo; anything doubtful waits. Alternatives: batch approve with checkboxes, or keep one-by-one.
   - *Finding new providers:* weekly Claude web search by category × neighborhood, then facts from each provider's **own** site. Parent directories (ParentMap, Seattle's Child, Seattle Parks catalogs) only as a source of names, never copying their write-ups.
   - *Area:* Seattle city only for the beta (the first run already surfaced a Kent provider).
   - *Budget:* about $20/month of Anthropic usage for weekly searches.
   - Review the 50 existing suggestions first to judge their quality before trusting auto-add.

**Launch readiness: these must be done before the password gate comes down:**
- **Honesty pass:** 13 placeholder stats across 7 files ("100+ families" has no real signups behind it; "80+"/"70+" providers vs the real **66 providers / 79 programs** in the seed data; "57+ verified"). Also 8 stale timing mentions ("Q3 2026", "this summer"), including in `/terms`.
- **Provider outreach kit:** a sheet of every seed business with its programs, website, and personal claim link, plus a draft email. Run the safe partial claim test first.
- **Small fixes:**
  - `/api/providers/submit` accepts any signed-in account, including a family account (the claim flow already blocks this).
  - A signed-in provider/admin clicking "Create Account" is bounced to an empty family dashboard.
  - Open Graph / email links use the bare domain instead of `www`.

---

## Calendar agent — roadmap

**Goal (Evan, 2026-11-11):** an automated agent that keeps families up to date and makes scheduling easier. It fits the core pitch-deck problem: families spend 20–30+ hours a season planning across disconnected tools.

**Jobs (all four wanted):** registration alerts · family calendar · change updates · scheduling help.

**Where dates come from: an automatic agent (changed 2026-11-14).** The first version had Kelly/Evan paste each provider's schedule. Evan rejected per-camp manual work, so the agent now visits every listing's website itself, finds the schedule/camp pages, and has Claude extract the dates. It publishes the ones it can **verify word-for-word on the page** and sends only uncertain ones to a one-click inbox. Scraping had been ruled out earlier as months of per-site parsers plus upkeep; AI reading any layout removes most of that. Sites it can't read (blocked, JavaScript-only, PDF schedules) fall back to the manual paste box in the Dates tab. Claimed providers may later enter their own dates.

**Families pick sessions, they don't type them:** a saved program can have many sessions, so the family taps "Add to my calendar" on the one they're in (Step B).

**Delivery (all four wanted), and the catch with each:**
- **Calendar subscription** (private link per family; no Google sign-in or app review). Calendar apps refresh subscribed feeds on their own schedule (Google can take up to ~a day), so it suits schedules, not urgent alerts.
- **Email** (Brevo, already set up): registration alerts, change notices, weekly digest. Driven by a daily scheduled job; Vercel's free plan runs scheduled jobs at most once a day.
- **Direct Google Calendar connect:** needs Google's app verification for calendar access (plan on weeks); until then, an "unverified app" warning and a test-user cap.
- **Text messages:** needs Twilio (or similar), per-message cost, opt-in/STOP handling, and US carrier (10DLC) registration before texts deliver reliably.

**Scheduling help needs data we don't store yet:** kids' names (profiles only have ages) and better locations (only neighborhoods). That's why it comes last.

**Phases:**
- **Phase 1:** Step A, the date foundation (✅ built 2026-11-11) plus the automatic date agent (✅ built 2026-11-14), see Completed Work; Step B, calendar subscription + Add-to-calendar + email alerts.
- **Phase 2:** weekly digest; kids' names on profiles.
- **Phase 3:** texts, direct Google Calendar, scheduling help (clashes, pickup overlaps, "fits your week").

## Planned — listing claim / ownership transfer
Built 2026-10-27 — see "Provider listing claims" under Completed Work. The original plan (admin-mediated verification, seed import with a `seed_id` tag, Discover de-dup) is what shipped.

## Open Decisions
- **Family registration:** ✅ decided — full auth flow (Option B), built 2026-08-02
- **Booking:** not in scope for Phase 1
- **Provider CRM:** TBD post-launch

---

## Key Files
| File | Purpose |
|------|---------|
| `app/page.tsx` | Homepage — imports all section components |
| `app/discover/page.tsx` | Discover/search page — main family-facing product |
| `app/data/activities.json` | Static seed listings (81 entries) |
| `app/components/Nav.tsx` | Site-wide fixed navigation |
| `app/components/Hero.tsx` | Homepage hero section |
| `app/components/Categories.tsx` | Homepage category grid with live counts |
| `app/components/Providers.tsx` | Homepage For Providers section |
| `app/components/Footer.tsx` | Site-wide footer |
| `app/for-families/page.tsx` | For Families static page |
| `app/for-providers/page.tsx` | For Providers static page |
| `app/about/page.tsx` | About static page |
| `app/providers/signup/page.tsx` | Provider signup form (account + business info) |
| `app/providers/login/page.tsx` | Provider sign in |
| `app/providers/forgot-password/page.tsx` | Request password reset link |
| `app/providers/reset-password/page.tsx` | Set new password from reset link |
| `app/providers/dashboard/page.tsx` | Provider dashboard — their listings + status (session-protected) |
| `app/providers/listings/new/page.tsx` | Provider listing creation entry (server component, auth check) |
| `app/providers/listings/new/ListingForm.tsx` | The 4-step listing wizard UI (create + edit modes) |
| `app/providers/listings/[id]/edit/page.tsx` | Provider listing edit (server component, auth + ownership) |
| `app/api/providers/listings/[id]/route.ts` | Provider listing update API (PATCH, ownership check) |
| `supabase/listing-reapproval.sql` | `submissions.reapproval_needed` + `edited_at` (run manually) |
| `supabase/listing-claims.sql` | `listing_claims` table + `submissions.seed_id` (run manually, before push) |
| `app/providers/claim/` | Claim search (`/providers/claim`) + direct claim links (`/providers/claim/[activityId]`) |
| `app/api/providers/claims/route.ts` | Provider: create a claim request |
| `app/api/admin/claims/` | Admin: review queue (`GET`) + approve/reject (`POST [id]`) |
| `app/admin/ClaimsPanel.tsx` | Admin Claims tab |
| `lib/claimable.ts` | Server-only claim logic (ownership, seed import, verification hints) |
| `lib/safe-next.ts` | Same-site-only redirect helper for `?next=` |
| `lib/notify.ts` | Brevo email helper |
| `supabase/activity-dates.sql` | `activity_dates` + `replace_activity_dates()` (run manually, before push) |
| `lib/activity-dates.ts` | Pure date helpers: card summaries, formatting, validation (client-safe) |
| `lib/activity-dates-server.ts` | Reads dates; date lines for Discover/dashboard; listings for the Dates tab |
| `lib/extract-dates.ts` | Anthropic API call that drafts dates from pasted page text |
| `app/api/admin/dates/` | Admin: listings + coverage, AI extract, per-listing GET/PUT |
| `app/admin/DatesPanel.tsx` | Admin Dates tab |
| `supabase/date-agent.sql` | Agent tables: `listing_sources`, `date_drafts`, `suggested_listings` (run manually, before push) |
| `lib/fetch-page.ts` | Polite, SSRF-safe page fetcher; HTML→text; schedule-link picking; robots.txt |
| `lib/date-agent-logic.ts` | Pure agent rules: quote verification, publish/review decision, display |
| `lib/date-agent.ts` | Runs the agent on one listing |
| `app/api/admin/agent/` | Agent status, check-one, inbox approve/dismiss, suggestion add/dismiss |
| `app/api/cron/date-agent/route.ts` | Daily automatic run (needs `CRON_SECRET`) |
| `vercel.json` | Cron schedule |
| `app/admin/AgentPanel.tsx` | Admin Agent tab |
| `app/api/providers/signup/route.ts` | Provider signup API (auth + profile) |
| `lib/provider-auth.ts` | `requireProvider()` helper for provider API routes |
| `supabase/provider-profiles.sql` | `provider_profiles` table + `submissions.provider_id` (run manually) |
| `app/admin/page.tsx` | Internal admin panel (server component, auth check) |
| `app/admin/AdminClient.tsx` | Internal admin panel UI |
| `app/admin/login/page.tsx` | Admin sign in |
| `lib/admin-auth.ts` | `requireAdmin()` helper for admin API routes |
| `supabase/admin-users.sql` | `admin_users` allowlist table (run manually) |
| `app/api/waitlist/route.ts` | Family waitlist API (Brevo) |
| `app/api/providers/submit/route.ts` | Provider listing submission API (requires login) |
| `app/api/admin/submissions/route.ts` | Admin: fetch submissions |
| `app/api/admin/submissions/[id]/status/route.ts` | Admin: approve/reject |
| `app/api/activities/route.ts` | Public: approved listings for Discover |
| `app/families/signup/page.tsx` | Family signup (2-step) |
| `app/families/login/page.tsx` | Family sign in |
| `app/families/forgot-password/page.tsx` | Request password reset link |
| `app/families/reset-password/page.tsx` | Set new password from reset link |
| `app/families/dashboard/page.tsx` | Family dashboard (session-protected) |
| `app/api/families/signup/route.ts` | Family signup API (auth + profile) |
| `middleware.ts` | Site gate + session refresh + `/families/*`, `/providers/*`, `/admin/*` route protection |
| `supabase/family-profiles.sql` | `profiles` table + RLS (run manually) |
| `supabase/saved-activities.sql` | `saved_activities` table + RLS (run manually) |
| `app/families/dashboard/DashboardClient.tsx` | Family dashboard UI — profile + saved activities |
| `lib/supabase.ts` | Supabase client instances (public + admin) |
| `lib/supabase-browser.ts` | Cookie-backed Supabase client (client components) |
| `lib/supabase-server.ts` | Cookie-backed Supabase client (server components) |
| `little-sound-design-tokens.css` | Design system — colors, fonts, spacing |
| `tailwind.config.js` | Tailwind config |

---

## Design System
- **Primary colors:** Dark Teal `#0D5C6E`, Medium Teal `#1A7A8A`, Blue-Grey `#C5D8E8`, Cream `#F5EFE0`
- **Gold accent:** `#C4A882`
- **Display font:** Cormorant Garamond (headlines, hero text)
- **Body/UI font:** DM Sans (all body and interface text)
- **UI style:** Rounded pill buttons, cream-background cards with soft shadows

---

## Known Issues
- Git index.lock errors caused by OneDrive syncing the repo — fix with `del .git\index.lock` in PowerShell
- Vercel deployment occasionally requires a manual re-push if the lock deletion interrupts the push
- **Stale launch-timing copy** (noted 2026-10-16): hero eyebrow "Seattle Beta · Q3 2026", closing-CTA perk "Seattle beta — Q3 2026", and the waitlist success message "before the Seattle beta opens this summer" are all past-dated now. Update once the new launch timing is set.
- ~~**Canonical domain not pinned**~~ — ✅ resolved 2026-11-11: Evan confirmed in a browser that `thelittlesound.com` redirects to `https://www.thelittlesound.com/`. `www` is the primary, which matches `SITE_URL` in `lib/site.ts` (used by the sitemap). Earlier fetch tools had followed the redirect silently, which made both hosts look like they served pages directly. Minor leftover: `app/layout.tsx` Open Graph URLs and Brevo email links still use the bare domain. They work, via the redirect, but could be switched to `www` sometime.

## Bugs found + fixed
Listed chronologically. #1–3 found and fixed 2026-08-03 while building and testing provider authentication; #4–5 found 2026-10-16 during the homepage CTA work; #6–10 found 2026-10-27 while building listing claims; #11–13 found 2026-11-14 on the date agent's first live run.

1. **Provider signup wrote two `submissions` rows per provider.** Both the account-creation step and the listing-creation step posted to the same `/api/providers/submit` endpoint, which always inserted into `submissions` regardless of type. Found while building provider auth (not from a live test). Fixed as part of that build — account creation no longer touches `submissions` at all.
2. **Duplicate-email signup silently broke account creation.** Supabase's anti-enumeration protection means `auth.signUp()` doesn't error when called with an already-registered email — it returns a decoy user object with an id that doesn't exist in `auth.users`, so nothing leaks about whether the email is taken. Both `/api/families/signup` and `/api/providers/signup` took that at face value and tried to write a profile row for the fake id, causing a foreign-key error (`23503`) that cascaded into other failures downstream (a provider's first listing submission then failed with a not-null violation because their profile was never actually created). Found when Evan tested provider signup with `esherm7@gmail.com`, which already had an admin account. Fixed by checking `data.user.identities.length === 0` right after signUp — now returns a clear "an account with this email already exists" error instead of silently corrupting state.
3. **Provider dashboard showed stale "no listings" right after submitting one.** The success screen's "Go to your dashboard" button used `next/link`, which Next.js prefetches in the background — so it cached a snapshot of the (empty) dashboard before the listing actually finished saving, then served that stale cache on click instead of fetching fresh. The listing itself saved correctly the whole time (confirmed via `/admin`). Fixed by using a plain `<a>` tag for that link (forces a full navigation, bypassing the router cache) and adding `export const dynamic = 'force-dynamic'` to `/providers/dashboard`, `/families/dashboard`, and `/admin` as defensive insurance against the same class of staleness.
4. **Provider "List your activity" CTAs sent providers to the family waitlist.** The homepage Providers section and the Discover footer both linked "List your activity" to `/#waitlist` (the family email list) rather than `/providers/signup`, so a provider clicking the most prominent provider CTA never reached signup. BUILD_STATUS claimed these pointed at `/providers/signup`; the code disagreed. Found reading the homepage for Next Up #3. Fixed by repointing both to `/providers/signup`.
5. **`/#waitlist` links scrolled nowhere on the homepage.** The nav's "Join Waitlist" button (desktop + mobile) and the provider CTA all linked to `/#waitlist`, but no element on the homepage had `id="waitlist"` (only `/for-families` did) — so they just dropped visitors at the top of the homepage. Fixed by adding `id="waitlist"` (with `scroll-mt-16` to clear the fixed nav) to the closing CTA section in `CTA.tsx`.
6. **Discover showed the submitter's personal name as the provider.** `/api/activities` mapped `provider: s.contact_name`, so every provider-submitted card read "Jane Doe" instead of the business name. Would have made claimed listings read as a person's name too. Fixed by looking up `provider_profiles.business_name` (falls back to `contact_name` for pre-account rows).
7. **Approved provider listings didn't appear on Discover until a filter changed.** The filtered-results `useMemo` depended on `[query, category, ageGroup, sort]` but not on the activity list, and provider listings arrive from the API after first render — so on page load they were silently left out. Fixed by adding `activities` to the dependencies.
8. **`/api/activities` was likely frozen at build time.** A Next 14 `GET` route handler that doesn't read the request is static by default, so newly approved listings likely didn't reach Discover until the next deploy (not confirmed against a live build — but #7 would have hidden it anyway). Fixed defensively with `export const dynamic = 'force-dynamic'`, matching the dashboards.
9. **Provider signup dropped where the user was headed.** Login's "sign up" link didn't carry `?next=`, signup ignored it, and the confirmation email returned to the Site URL — then signup sent everyone to *create a new listing*. A provider arriving from a claim link would have created a duplicate of the listing they came to claim. Fixed by carrying `next` through login → signup → `emailRedirectTo` → login, and through the middleware's signed-in bounce.
10. **Open redirect via `?next=`.** Provider login, family login, and `/unlock` redirected to any `next` value, including other sites (`/providers/login?next=https://evil.example` would send someone there right after signing in). Fixed with `lib/safe-next.ts`, which only allows same-site paths.
11. **Every date-agent check failed on the first run.** `claude-sonnet-5-5` rejects a forced `tool_choice` (`"tool"`/`"any"` → HTTP 400), which `lib/extract-dates.ts` sent on every request, so all 79 listings showed "couldn't read". The sandbox tests used a fake AI, so only the live API could reveal it. Fixed: Claude 5-family models get `tool_choice: auto` (the prompt says to always call the tool) plus `effort: medium`; older models keep the forced tool; a clear error if the AI skips the tool.
12. **robots.txt wildcards blocked whole sites.** `robotsAllows` cut each rule at its first `*`, so Squarespace's default `Disallow: /*?author=*` became `Disallow: /` and every Squarespace site read as "asks bots not to read this page". Fixed with RFC 9309 matching (wildcards, `$` anchor, path + query, longest rule wins), robots re-checked on every redirect hop, and connection errors now say why (bad address, refused, invalid certificate). "Couldn't read" dropped from 35 to 13.
13. **Harmless AI notes held verified dates for review.** Any AI warning sent a listing to the inbox, including FYIs like "registration is by email" or "holiday sessions not dated yet", so only 1 of 14 listings with dates published. Fixed: the AI now separates doubts (block publishing) from notes (shown only); a year in a nearby heading counts as stated.

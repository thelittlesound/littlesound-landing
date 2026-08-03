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
| `app/admin/page.tsx` | `/admin` | Password-protected admin panel (review, approve, reject submissions) |
| `app/api/admin/submissions/route.ts` | `GET /api/admin/submissions` | Fetches submissions from Supabase (filterable by status) |
| `app/api/admin/submissions/[id]/status/route.ts` | `POST /api/admin/submissions/[id]/status` | Updates submission status + admin notes in Supabase |
| `app/api/activities/route.ts` | `GET /api/activities` | Returns approved submissions mapped to activity card shape |
| `lib/supabase.ts` | — | Supabase client (public) + supabaseAdmin (service role, server-only) |

**Infrastructure:**
- Supabase project: `https://eyuetlkggoaegtyhirbt.supabase.co` (West US / Oregon)
- `submissions` table: id, created_at, status, contact_name, contact_email, phone, title, category, subcategory, description, age_min, age_max, price, price_unit, neighborhood, website, admin_notes, reviewed_at, reviewed_by
- RLS enabled on Supabase project
- Brevo provider list: Little Sound Providers (List #5)
- Admin password: `littlesound2026` (set via `NEXT_PUBLIC_ADMIN_PASSWORD` env var to change)

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
- Providers section has three CTA buttons: Claim Your Listing, See How We List Providers, List Your Activity → `/providers/signup`

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
| `supabase/family-profiles.sql` | — | **Not yet run** — creates `profiles` table + RLS policies. Run once in Supabase SQL editor. |

**Infrastructure:**
- `profiles` table (see `supabase/family-profiles.sql`): id (references `auth.users`), first_name, last_name, email, neighborhood, kids (jsonb array of `{age}`), preferences (text[]), created_at, updated_at
- RLS: families can select/update their own row only; row creation happens server-side via `supabaseAdmin` (service role), so no insert policy needed
- Added `@supabase/ssr` to `package.json` — run `npm install` before next `npm run dev`/build
- Nav updated with a "Sign In" link (desktop) / "Family Sign In" link (mobile) pointing to `/families/login`

**Still needed before this goes live:**
1. Run `supabase/family-profiles.sql` in the Supabase SQL editor (Project → SQL Editor)
2. `npm install` to pull in `@supabase/ssr`
3. Confirm whether "Confirm email" is on or off in Supabase Auth settings — determines whether new families land straight in the dashboard or see a "check your email" screen first
4. `npm run build` locally or a Vercel preview deploy to catch anything environment-specific

### Site-wide password gate (fully complete)

**Why:** Real family/provider signups aren't live yet — the "100+ families," "57+ providers verified" language across the site is aspirational, not real. Rather than show fabricated or embarrassingly-low real numbers while still building, the whole site is now gated behind a shared password until there's real traction worth launching publicly with.

**How it works:** `middleware.ts` now runs on nearly every request (pages, API routes, everything except Next's static assets). It checks for a `ls_site_access` cookie matching `SITE_ACCESS_PASSWORD`; if missing or wrong, it redirects to `/unlock`, a simple password form that POSTs to `/api/site-gate` and sets an HttpOnly cookie on success (30-day expiry).

**⚠️ Action required before/after this deploys:**
- Set `SITE_ACCESS_PASSWORD` in Vercel → Project Settings → Environment Variables (any string you choose — share it only with people who should see the site right now).
- **If this isn't set, the site fails closed in production — meaning nobody, including you, can get in.** That's intentional (safer than accidentally leaking it open), but don't forget to set it.
- Locally, `npm run dev` falls back to a hardcoded dev password (`dev-preview`) so you don't need the env var set to test on your machine.

**To go public again later:** remove or rename `SITE_ACCESS_PASSWORD` handling in `middleware.ts` (or just stop requiring it), once there's real traction and honest numbers to show. At that point, also revisit the fabricated "100+ families / 57+ providers" copy across `Hero.tsx`, `CTA.tsx`, `for-families/page.tsx`, `for-providers/page.tsx`, `about/page.tsx`, and `providers/signup/page.tsx` — replace with real live counts or honest qualitative language.

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

**Two separate things need fixing:**
1. **Email content/branding** — templates drafted, ready to paste in. See `supabase/email-templates/confirm-signup.html` and `reset-password.html`.
2. **Sender address** ("from Little Sound," not a generic Supabase domain) — requires setting up custom SMTP in Supabase, since the built-in email service forces its own sender domain. This also fixes the email rate-limit issue we hit during testing (Supabase's default email service is limited to a handful of emails/hour — fine for testing, not for real families).

**⚠️ Action required (Supabase dashboard, both are UI-only, no code changes):**
1. **Content:** Authentication → Email Templates → select "Confirm signup" → paste in `confirm-signup.html`'s body, set subject to "Confirm your Little Sound account" → Save. Repeat for "Reset Password" using `reset-password.html`, subject "Reset your Little Sound password."
2. **Sender:** Authentication → Settings → SMTP Settings → enable custom SMTP. Recommend reusing Brevo (already set up and verified for `hello@thelittlesound.com` — used for provider notification emails). Get SMTP credentials from Brevo dashboard → SMTP & API → SMTP tab (host `smtp-relay.brevo.com`, port 587, your Brevo login as username, an SMTP key as password), enter those in Supabase along with Sender email `hello@thelittlesound.com` and Sender name `Little Sound`.

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
| `supabase/provider-profiles.sql` | — | **Not yet run** — creates `provider_profiles` table + adds `provider_id` column to `submissions`. Run once in Supabase SQL editor. |

**Changed files:**
- `app/providers/signup/page.tsx` — added password/confirm-password fields, now posts to `/api/providers/signup` instead of `/api/providers/submit`, "check your email" screen added, footer link now points to `/providers/login`
- `app/providers/listings/new/page.tsx` — now a server component: requires login, redirects to `/providers/login` if not signed in, fetches the provider's profile and passes it to `ListingForm`
- `app/api/providers/submit/route.ts` — now listing-only (the dead `type: 'signup'` branch and `buildSignupEmail` are gone), requires `requireProvider()`, tags each row with `provider_id`
- `middleware.ts` — restructured family + provider route protection into a shared `PORTALS` list (same "protect the dashboard, bounce logged-in users off login/signup" pattern for both)

**Infrastructure:**
- `provider_profiles` table: id (references `auth.users`), first_name, last_name, email, business_name, category, website, phone, timestamps — same RLS pattern as `profiles` (select/update own row only, insert via service role)
- `submissions.provider_id` — new nullable column linking a listing to the provider who submitted it; existing pre-auth rows just have it as null

**⚠️ Action required:**
1. Run `supabase/provider-profiles.sql` in the Supabase SQL editor.
2. That's it — no manual account creation needed this time (unlike admins), providers self-serve through `/providers/signup` same as families.

**Not built yet (intentionally out of scope for this pass):** editing an already-submitted listing. The dashboard is view-only for now — the copy says to email hello@ for changes. Worth revisiting once there's real provider volume.

### Previous work
- Data verification pass on top 15 listings
- Static pages: `/for-families`, `/for-providers`, `/about`
- Site-wide nav (`app/components/Nav.tsx`) — fixed top, mobile hamburger; links: Browse Activities, For Families, For Providers
- Homepage flow: Hero → Problem → Solution → Categories → Founders → Providers → CTA

---

## Next Up

**Functional gaps flagged 2026-08-03 — fixing in priority order:**
1. ~~**Admin panel security**~~ — done, see "Admin panel real auth" above.
2. ~~**Family password recovery**~~ — done, see "Family password recovery" above.
3. ~~**Provider authentication doesn't exist**~~ — done, see "Provider authentication" above. Still need to run `provider-profiles.sql` (see that section).
4. **Family dashboard is mostly a placeholder** — profile (neighborhood/kids/interests) saves for real, but "saved activities" and "booking history" are just placeholder text, no feature behind them yet.
5. ~~**Branded confirmation email**~~ — done, see "Branded auth emails" above.
6. **No `sitemap.xml`** — irrelevant while the site is password-gated; matters once public again.

**Other open items:**
- **Set `SITE_ACCESS_PASSWORD` in Vercel** — required immediately after this deploys, or the site is unreachable (see Site-wide password gate section above)
- ~~Run `supabase/family-profiles.sql` + `npm install`~~ — done, deployed and tested live 2026-08-03
- **Homepage CTA** — homepage still only pushes the waitlist; consider adding a "Create Your Account" link there too, same as `/for-families` (do this once the site is public again)
- **Fix fabricated stats** — "100+ families," "57+ providers verified" language across the site needs replacing with real live counts or honest language before going public again (see Site-wide password gate section)

---

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
| `app/providers/listings/new/ListingForm.tsx` | The 4-step listing wizard UI |
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

## Bugs found + fixed
- **2026-08-03 — Provider dashboard showed stale "no listings" right after submitting one.** The success screen's "Go to your dashboard" button used `next/link`, which Next.js prefetches in the background — so it cached a snapshot of the (empty) dashboard before the listing actually finished saving, then served that stale cache on click instead of fetching fresh. The listing itself saved correctly the whole time (confirmed via `/admin`). Fixed by using a plain `<a>` tag for that link (forces a full navigation, bypassing the router cache) and adding `export const dynamic = 'force-dynamic'` to `/providers/dashboard`, `/families/dashboard`, and `/admin` as defensive insurance against the same class of staleness.
- **2026-08-03 — Duplicate-email signup silently broke account creation.** Supabase's anti-enumeration protection means `auth.signUp()` doesn't error when called with an already-registered email — it returns a decoy user object with an id that doesn't exist in `auth.users`, so nothing leaks about whether the email is taken. Both `/api/families/signup` and `/api/providers/signup` took that at face value and tried to write a profile row for the fake id, causing a foreign-key error (`23503`) that cascaded into other failures downstream (e.g. a provider's first listing submission failing with a not-null violation because their profile was never actually created). Found when Evan tested provider signup with an email that already had an admin account. Fixed by checking `data.user.identities.length === 0` right after signUp — now returns a clear "an account with this email already exists" error instead of silently corrupting state.
- **2026-08-03 — Provider signup wrote two `submissions` rows per provider.** Both the account-creation step and the listing-creation step posted to the same `/api/providers/submit` endpoint, which always inserted into `submissions` regardless of type. Fixed as part of the provider authentication build — account creation no longer touches `submissions` at all.

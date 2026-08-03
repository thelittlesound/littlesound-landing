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
**Phase 1 — Seattle Beta (Q3 2026)**
- Marketing site live and complete
- 100+ families on waitlist
- 80+ providers catalogued in `app/data/activities.json`
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

### Previous work
- Data verification pass on top 15 listings
- Static pages: `/for-families`, `/for-providers`, `/about`
- Site-wide nav (`app/components/Nav.tsx`) — fixed top, mobile hamburger; links: Browse Activities, For Families, For Providers
- Homepage flow: Hero → Problem → Solution → Categories → Founders → Providers → CTA

---

## Next Up
- **Run `supabase/family-profiles.sql`** in the Supabase SQL editor + `npm install` — required before family auth works end to end
- **Provider dashboard** — view/edit listing post-submission (can now reuse the family auth pattern — Supabase Auth + `@supabase/ssr` + `middleware.ts`)
- **Saved activities / booking history** — dashboard has a placeholder for this; not yet built
- **Admin password** — move from env var to proper auth (post-beta)

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
| `app/providers/signup/page.tsx` | Provider signup form |
| `app/providers/listings/new/page.tsx` | Provider listing creation (4-step) |
| `app/admin/page.tsx` | Internal admin panel |
| `app/api/waitlist/route.ts` | Family waitlist API (Brevo) |
| `app/api/providers/submit/route.ts` | Provider submission API |
| `app/api/admin/submissions/route.ts` | Admin: fetch submissions |
| `app/api/admin/submissions/[id]/status/route.ts` | Admin: approve/reject |
| `app/api/activities/route.ts` | Public: approved listings for Discover |
| `app/families/signup/page.tsx` | Family signup (2-step) |
| `app/families/login/page.tsx` | Family sign in |
| `app/families/dashboard/page.tsx` | Family dashboard (session-protected) |
| `app/api/families/signup/route.ts` | Family signup API (auth + profile) |
| `middleware.ts` | Session refresh + `/families/*` route protection |
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

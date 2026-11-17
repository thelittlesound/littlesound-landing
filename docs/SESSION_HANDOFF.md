# Little Sound: handoff for a new chat (updated 2026-11-16, 11pm: sports + discovery live, 120 provider listings)

Read this first, then `BUILD_STATUS.md` (the repo's source of truth; the repo copy is newer than the Project copy). Both live in the repo on Evan's PC.

## Where things are
- **Code:** GitHub `thelittlesound/littlesound-landing`. Every push to `main` deploys to Vercel (Hobby plan). The site is still behind a password gate.
- **Evan's local repo:** `C:\Users\esher\OneDrive\Desktop\Little Sound\littlesound-landing-page`. In a linked session's device shell it is `$HOME/mnt/Little Sound/littlesound-landing-page`.
- **Stack:** Next.js 14 App Router, TypeScript (strict OFF), Tailwind, Supabase. Email via Brevo, AI via Anthropic (web search + web fetch for the discovery agent), JS-only pages via Cloudflare Browser Run.
- **Secrets live only in Vercel env vars:** `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CRON_SECRET`, Supabase keys. Never ask for them in chat or put them in the repo.
- **Pushed and live:** everything through `7ffa608` (discovery ZIP locations + editable suggestion cards). Only the docs commit after it may be unpushed: if `git status -sb` shows `ahead`, ask Evan to push.
- **Database:** every SQL file is applied, including `supabase/discovery.sql` (2026-11-16).

## How we work (Evan's rules)
- **Mockup before building anything visual** (Design canvas artifact), then Evan approves, then build. He likes bold, distinctive UX; **user experience first, no analysis paralysis** (see product rules below).
- Claude commits locally on Evan's PC; **Evan runs `git push`**. Request folder access to `...\Desktop\Little Sound` and **delete permission** for it once per session (git needs it for lock files).
- If a commit fails with "Another git process seems to be running", ask Evan to `del` the `.git\*.lock` file.
- Server components with live per-user data: `export const dynamic = 'force-dynamic'`; plain `<a>` after a mutation.
- New `supabase.auth.signUp()` flows check `data.user.identities.length === 0`.
- Commit trailers: `Co-Authored-By: Claude …` plus the session link from the attribution reminder.
- Schema changes are SQL Evan pastes into the Supabase SQL editor: **give him the SQL itself in chat, in a code block**, ending with `notify pgrst, 'reload schema';`. Code falls back gracefully until it runs.
- Listing facts come from the provider's own site; directories/news/social only to find names (and, when needed, to confirm an address). Don't invent fees: `price: null` → "Fees on their site".
- Before suggesting Add / Dismiss in bulk, show Evan the grouped list and ask; he decides.

## Product rules (Evan, 2026-11-16)
Goal: the most comprehensive, easiest-to-search place for kids' camps, activities and sports, **without analysis paralysis**. Start from the child; answer the parent's question first; a few good picks (with **"Why it fits"**, which Evan likes), then the rest; filters only after narrowing; the same card shape everywhere (When, Level, Who can join / Where, Cost). Approved mockup: https://claude.ai/artifact/FZHd2pq5EbzdyyhFKA9vLh (child-first Discover, not built yet).

## Gotchas learned the hard way
- **TypeScript strict is OFF in the repo:** `if (!r.ok)` doesn't narrow a union; use `'error' in r`. Typecheck with `strict: false` (Vercel caught this once).
- **Next 14 caches server `fetch()` in Vercel's Data Cache (survives deploys).** Fixed in `lib/supabase.ts` (every supabase-js request is `cache: 'no-store'`). Before that, `/api/activities` (Discover's feed) served a stale list and stale date lines.
- **Supabase types each query by its select string:** keep separate `first` / `fallback` results.
- **`profiles` has no client insert policy;** saves go through `POST /api/families/profile`.
- **CRLF files:** `app/discover/page.tsx`, privacy, terms. Edit with Python `newline=''`.
- **`app/data/activities.json` mixes `\u` escapes and literal characters:** append new entries as text before the final `]`; never re-serialize the file.
- **WebFetch in chat only works on URLs a search returned;** search first.
- **Built-in browser** (preferred) has its own sign-ins: Evan types the site password and admin login himself. Long JS jobs in the page: start them in the background (`window.__log`) and poll, or the tool times out at 45s.
- **Agent tab "Add all" ignores card edits** (neighborhood/ages). Use each card's Add after editing.

## Testing
- `tests/*.test.ts`: 180 checks (alerts, calendar-grid, discovery 28, family-profile, family-rhythm, kid-match, summer). No esbuild anywhere (npm blocked): run with Node 22 type stripping plus a resolver hook. In a scratch folder write `hooks.mjs` (a `resolve` hook mapping `@/x` → `<repo>/x`, trying `.ts`/`.tsx`/`/index.ts`, also for relative imports) and `reg.mjs` (`register('./hooks.mjs', import.meta.url)`), then `LS_ROOT=$(pwd) node --experimental-strip-types --no-warnings --import <scratch>/reg.mjs tests/<name>.test.ts`.
- Typecheck in the cloud sandbox: stage files, small `.d.ts` shims (react hooks, `next/server`, `@supabase/supabase-js`, server modules), `tsc` with `strict: false` and `paths: {"@/*": ["./repo/*"]}` (no `baseUrl`).

## Current product state
- **Catalog:** 93 seed programs (Sports 24, incl. 18 West Seattle/White Center clubs added 2026-11-16) + **120 approved provider/agent listings** (80 added from discovery suggestions on 2026-11-16: soccer, baseball/softball, basketball, volleyball, football, lacrosse, running, swim, gymnastics, martial arts, tennis/pickleball, climbing, wrestling, ultimate, water sports, roller derby; West Seattle, White Center, Burien, Tukwila and the rest of Seattle with real neighborhoods).
- **Discover:** sport pills under Sports, Rec / Club row, level tag and "Who can join" on cards, "Fees on their site" when no price; "Browsing for {child}".
- **Family dashboard:** Family Rhythm (week ahead, breathing room, clashes, Signup radar, Summer planner).
- **Date agent:** daily; reads every listing's site for dates (now including the new ones).
- **Discovery agent:** 16 sports × 3 areas (West Seattle, Delridge, White Center); daily cron (one or two searches), each search monthly; Agent tab → **Find new providers** (Run due searches / **Re-run every search now**). Locations come from the address ZIP on the provider's own site (`ZIP_NEIGHBORHOODS`); without one, "Location not confirmed". Suggestion cards have editable Neighborhood + Ages; Add refuses a suggestion with no neighborhood.

## Where we stopped (2026-11-16, 11pm)
Two full discovery runs reviewed with Evan in the browser. Added 80 programs; dismissed 4 non-programs; corrected neighborhoods by address.

**Still in the Agent inbox (8):**
- **Members-only (Evan chose to hold):** Tennis Center Sand Point ×2, Arbor Heights junior tennis team, Gregory Seahurst Swim Club.
- **Location not confirmed:** Seattle Wrestling Club, Jet City Wrestling, Rainier Select Basketball, Let Me Run (school-based, boys grades 3–5).

**Unverified neighborhoods** set from memory (correct if wrong): Vertical World = Interbay, Seattle Yacht Club = Montlake, Pocock = Eastlake, Seattle Canoe & Kayak = Green Lake, Props Lacrosse = Magnolia, Seattle Central LL = Central District. Also assumed ages: Highline Premier FC 8–18, Southwest LL 4–14, Seattle Volleyball Academy 11–16.

**Still to confirm from before:** pencilled camp shows "For Ella" in saved; Erase from plan reopens the week; Pottery can be assigned to a child; Remind me on a dated signup; no Creative Care in summer ideas.

## Next up
1. **Go granular on each existing category** (Evan's next focus), mockup first: per category, inventory → subcategories parents filter by + 1–2 category-specific fields → mockup → approve → build → discovery searches for that category.
2. **Build the approved child-first Discover** (mockup above).
3. Small fixes: "Add all" should carry card edits; provider listing form asks for level + who can join; claimed seed listings keep `level`/`serves`; tryout dates on the Signup radar and alerts; a way to edit a live listing's neighborhood from `/admin`.
4. Earlier list: family signup asks interests per child; smarter weekly ideas; Step B phone-calendar check; launch-readiness (honesty pass on stats now that the catalog is ~210 programs, outreach kit, small fixes).

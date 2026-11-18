# Little Sound: handoff for a new chat (updated 2026-11-17 evening: wave logo added; next session = full-site brand sweep)

Read this first, then `BUILD_STATUS.md` (the repo's source of truth; the repo copy is newer than the Project copy). Both live in the repo on Evan's PC.

## Where things are
- **Code:** GitHub `thelittlesound/littlesound-landing`. Every push to `main` deploys to Vercel (Hobby plan). The site is still behind a password gate.
- **Evan's local repo:** `C:\Users\esher\OneDrive\Desktop\Little Sound\littlesound-landing-page`. In a linked session's device shell it is `$HOME/mnt/Little Sound/littlesound-landing-page`.
- **Stack:** Next.js 14 App Router, TypeScript (strict OFF), Tailwind, Supabase. Email via Brevo, AI via Anthropic (web search + web fetch for the discovery agent), JS-only pages via Cloudflare Browser Run.
- **Secrets live only in Vercel env vars:** `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CRON_SECRET`, Supabase keys. Never ask for them in chat or put them in the repo.
- **Pushed and live:** everything through `179b149` (discovery for 28 topics × 5 areas; Add all carries card edits). Only the docs commit after it may be unpushed: if `git status -sb` shows `ahead`, ask Evan to push.
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
- **Agent tab "Add all" now carries card edits** (fixed in `179b149`).
- **Many provider sites are not on the chat WebFetch allowlist.** To read one, open it in the built-in browser (`request_access` once per site).

## Testing
- `tests/*.test.ts`: 180 checks (alerts, calendar-grid, discovery 28, family-profile, family-rhythm, kid-match, summer). No esbuild anywhere (npm blocked): run with Node 22 type stripping plus a resolver hook. In a scratch folder write `hooks.mjs` (a `resolve` hook mapping `@/x` → `<repo>/x`, trying `.ts`/`.tsx`/`/index.ts`, also for relative imports) and `reg.mjs` (`register('./hooks.mjs', import.meta.url)`), then `LS_ROOT=$(pwd) node --experimental-strip-types --no-warnings --import <scratch>/reg.mjs tests/<name>.test.ts`.
- Typecheck in the cloud sandbox: stage files, small `.d.ts` shims (react hooks, `next/server`, `@supabase/supabase-js`, server modules), `tsc` with `strict: false` and `paths: {"@/*": ["./repo/*"]}` (no `baseUrl`).

## Current product state
- **Catalog:** 93 seed programs + **~211 live listings on Discover** (`/api/activities` total on 2026-11-17; 96 of them in West Seattle, Delridge, White Center, South Seattle, Burien, Normandy Park, Des Moines, Tukwila). Covers sports plus arts, music, dance, theater, STEM, swim lessons, camps, early learning, languages, cooking, outdoor, tutoring.
- **Discover:** sport pills under Sports, Rec / Club row, level tag and "Who can join" on cards, "Fees on their site" when no price; "Browsing for {child}".
- **Family dashboard:** Family Rhythm (week ahead, breathing room, clashes, Signup radar, Summer planner).
- **Date agent:** daily; reads every listing's site for dates.
- **Discovery agent:** 28 topics (16 sports + 12 other categories) × 5 areas (West Seattle; Delridge; White Center & Boulevard Park; South Park/Georgetown → "South Seattle"; Burien/Normandy Park) = 140 searches, each monthly, daily cron. Agent tab → **Find new providers**. Locations come from the address ZIP on the provider's own site; without one, "Location not confirmed". Suggestion cards have editable Neighborhood + Ages, sent with Add and Add all; Add refuses a suggestion with no neighborhood.

## Wave logo (2026-11-17 evening)
- **Logo:** three lines taken from the wave art on the investor deck cover (Canva PDF in the Project; the art is vector, 16 lines, cut from one large swirl). Saved as `public/images/logo-waves.svg`: lines 0/3/6 of the cover corner, ends faded, blue-grey `#C5D8E8`.
- **Placement Evan approved ("F1"):** behind the "Little Sound" wordmark, angled up and to the right (`-rotate-[8deg]`, 120px wide, 60% opacity). In `Nav.tsx` (bar stays 64px; the Link clips the waves vertically with `[clip-path:inset(0_-48px)]`) and the `Footer.tsx` heading. Evan likes it in the nav.
- **Rejected:** all 16 lines (too busy at nav size), a redrawn symmetric wave ("worse"), waves as section decoration. The old floating 3-wave SVG in `Solution.tsx` (How It Works) was removed; Evan wants no wave decoration on sections.
- The unused `waves-corner.svg` was moved to `Little Sound\_to_delete\` for Evan to delete.
- Commits `1df4488`, `7d59ba4`, `045c11a`. If `git status -sb` shows `ahead`, ask Evan to push.

## Next session: full-site brand sweep (Evan, 2026-11-17)
Goal: every page matches the design files and is **consistent, coherent, and representative of the brand and product**.

**Sources of truth:** `little-sound-design-tokens.css` (Project) and the project instructions (Dark Teal #0D5C6E, Medium Teal #1A7A8A, Blue-Grey #C5D8E8, Cream #F5EFE0, tan #C4A882; Cormorant Garamond 300/400 for display, DM Sans 400/500/600 for body/UI; pill buttons; cream cards with soft shadows; rounded photos; thin line icons in tan), the investor deck PDF, and the brand voice (warm, parent-friendly; taglines "One platform. Zero friction." / "Less searching. More living. Families first.").

**Pages (25):** `/`, `/discover`, `/for-families`, `/for-providers`, `/about`, `/unlock`, `/privacy`, `/terms`; families: signup, login, forgot/reset password, dashboard; providers: signup, login, forgot/reset password, dashboard, claim, claim/[activityId], listings/new, listings/[id]/edit; `/admin`, `/admin/login`. Home sections: Hero, Problem, Solution, Categories, Founders, Providers, CTA, Footer.

**Suggested process:**
1. Read the tokens file and grep for off-token values (raw hex not in the palette, default Tailwind colors, font families, radii, shadows). Already spotted: `Footer.tsx` uses `bg-teal-900` / `text-blue-grey-300` while Nav uses `#0D5C6E`; nav hover tan `#A8865A` and mobile menu `#0A4A5A` are off-palette; How It Works uses emoji icons (✏️ 🌲 ☕) instead of thin tan line icons; check the fonts are actually loaded site-wide (the nav sets Cormorant by arbitrary class).
2. Screenshot every page at desktop and phone (375px) in the built-in browser (Evan types the site password and logins).
3. Publish one audit page grouped by page, each issue tagged colors / type / components / imagery / copy / mobile, with a proposed fix. Include copy: voice, taglines, and the honesty pass on placeholder stats (catalog is now ~211 programs).
4. Evan approves, then fix in batches (shared components first: Nav, Footer, buttons, cards), mockup first for anything visual, and re-screenshot to check.

## Where we stopped (2026-11-17, discovery)
Ran the 92 new all-category searches, reviewed the 118 suggestions with Evan. **86 added** (74 in one batch with label fixes, then 12 after looking up addresses), 13 cleared (12 farther suburbs + Seattle Starz in Issaquah), 2 dismissed (restricted).

**Neighborhoods set from address lookups (2026-11-17):** Mode Music ×2 = Delridge (3801 Delridge Way SW), Cooking With Friends = West Seattle (pop-ups at 9131 California Ave SW), Nemo Swim = Burien (home-pool lessons), NWAA TeenSounds = Normandy Park (John Knox Presbyterian); **KidSounds = Normandy Park is assumed** (same org, rehearsal site not found); Seattle Languages International = Citywide (private lessons, PO box only); Seattle Outrigger = Wallingford (Waterway 18; an older directory gives a south-end address).

**Still pending in the Agent inbox:**
- **Location not found (8):** Art & Soul Kids, Out in the Wild Learning, Write Seattle, Inclusive Tech WA, Seattle Vision Basketball, LOCALHOOPS, NPJ Volleyball, STMP Kids. Their own sites aren't reachable from chat WebFetch; open them in the built-in browser to find an address.
- **School-based / restricted (held):** Jump On Languages, Seattle Young Engineers, TGA ×2, WorldKids, Ochre Outdoor Learning, Starfire competitive league, Highline Tutoring, Burien Green Teens (16–18 internship).
- **From 11-16:** members-only (Tennis Center Sand Point ×2, Arbor Heights, Gregory Seahurst) and location-unknown (Seattle Wrestling Club, Jet City Wrestling, Rainier Select, Let Me Run).

**Evan approved adding No Limits Academy** (West Seattle/Burien AAU basketball; tryouts 11/23–24/26 at Salvation Army White Center, 9050 16th Ave SW; practices at Salvation Army White Center + White Center Heights Elementary; nolimitsacademyseattle.com). **Not added yet:** its site posts no ages/grades; ask them (nolimitsacademyseattle@gmail.com) or add once known. Seed listings need numeric ages.

**Unverified from 11-16** (correct if wrong): Vertical World = Interbay, Seattle Yacht Club = Montlake, Pocock = Eastlake, Seattle Canoe & Kayak = Green Lake, Props Lacrosse = Magnolia, Seattle Central LL = Central District; assumed ages Highline Premier FC 8–18, Southwest LL 4–14, Seattle Volleyball Academy 11–16.

**Still to confirm from before:** pencilled camp shows "For Ella" in saved; Erase from plan reopens the week; Pottery can be assigned to a child; Remind me on a dated signup; no Creative Care in summer ideas.

## Next up
0. **Full-site brand sweep** (see the section above). Evan asked for this to be the next session.
1. **Go granular on each existing category** (Evan's next focus), mockup first: per category, inventory → subcategories parents filter by + 1–2 category-specific fields → mockup → approve → build → discovery searches for that category.
2. **Build the approved child-first Discover** (mockup above).
3. Small fixes: provider listing form asks for level + who can join; claimed seed listings keep `level`/`serves`; tryout dates on the Signup radar and alerts; a way to edit a live listing's neighborhood from `/admin`.
4. Earlier list: family signup asks interests per child; smarter weekly ideas; Step B phone-calendar check; launch-readiness (honesty pass on stats now that the catalog is ~210 programs, outreach kit, small fixes).

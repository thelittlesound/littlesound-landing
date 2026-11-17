# Little Sound: handoff for a new chat (updated 2026-11-16 night: West Seattle sports + discovery agent)

Read this first, then `BUILD_STATUS.md` (the repo's source of truth; a copy is in this Project, and the repo's copy is newer). Both live in the repo on Evan's PC.

## Where things are
- **Code:** GitHub `thelittlesound/littlesound-landing`. Every push to `main` deploys to Vercel (Hobby plan). The site is still behind a password gate.
- **Evan's local repo:** `C:\Users\esher\OneDrive\Desktop\Little Sound\littlesound-landing-page`. In a linked session's device shell it is `$HOME/mnt/Little Sound/littlesound-landing-page`.
- **Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase. Email through Resend/Brevo, AI through Anthropic (incl. web search + web fetch for the discovery agent), JS-only pages via Cloudflare Browser Run `/content`.
- **Secrets live only in Vercel env vars:** `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN` (Sensitive), `CLOUDFLARE_ACCOUNT_ID`, `CRON_SECRET`, Supabase keys. Never ask for them in chat or put them in the repo.
- **Pushed and live:** through `d6e1bf4` (Summer planner: add-on care out, open weeks name the top idea). **Committed locally, not yet pushed (2026-11-16 night):** `dae0061` (18 West Seattle sports listings; sport/level/who-can-join on Discover; "$0" price fix) and `e6872b4` (discovery agent), plus the docs commit after them. If `git status -sb` shows `ahead`, ask Evan to push.
- **Database:** every SQL file is applied **except `supabase/discovery.sql`** (new; Evan runs it). Code falls back gracefully until it runs.

## How we work (Evan's rules)
- Claude commits locally on Evan's PC; **Evan runs `git push`** himself. The cloud sandbox can't reach GitHub.
- The device shell works in the repo directly (request folder access to `...\Desktop\Little Sound`). Git commits there need **delete permission** for that folder (git removes its own lock files); request it once per session with `device_request_delete_permission`.
- If a commit fails with "Another git process seems to be running", ask Evan to `del` the `.git\*.lock` file in PowerShell.
- Server components with live per-user data: `export const dynamic = 'force-dynamic'`; plain `<a>` (not `<Link>`) after a mutation.
- New `supabase.auth.signUp()` flows must check `data.user.identities.length === 0`.
- Commit trailers: `Co-Authored-By: Claude …` plus the session link from the attribution reminder.
- Show Evan a mockup before shipping anything big and visual. He likes bold, distinctive UX.
- Schema changes are SQL Evan runs in the Supabase SQL editor, ending with `notify pgrst, 'reload schema';`. Code must fall back until it has run.
- Facts on listings come from the provider's own site; directories/news/social only for finding names. Don't invent fees: leave `price: null` ("Fees on their site").

## Gotchas learned the hard way
- **Supabase types each query by its select string.** Keep separate `first` and `fallback` results.
- **`profiles` has no client insert policy.** Profile saves go through `POST /api/families/profile`.
- **CRLF files:** `app/discover/page.tsx`, privacy, terms. Edit with Python `newline=''`, convert to LF and back.
- **`app/data/activities.json` mixes `\u` escapes and literal characters.** Append new entries as text before the final `]`; don't re-serialize the whole file (it rewrites old lines).
- **WebFetch in chat only works on URLs a search returned**; search first, then fetch the result link.
- **Moving files from the cloud sandbox to the PC:** write them under `/mnt/user-data/outputs/<new folder>/`, then `device_commit_files` straight to their repo paths (new folder name each time).

## Testing
- **Pure-logic tests** in `tests/*.test.ts` (172 checks: alerts, calendar-grid, discovery, family-profile, family-rhythm, kid-match, summer). esbuild isn't available anywhere (npm blocked), so run them with Node 22 type stripping plus a resolver hook: in a scratch folder write `hooks.mjs` (a `resolve` hook mapping `@/x` → `<repo>/x`, trying `.ts`/`.tsx`/`/index.ts`, also for relative imports) and `reg.mjs` (`register('./hooks.mjs', import.meta.url)`), then `LS_ROOT=$(pwd) node --experimental-strip-types --no-warnings --import <scratch>/reg.mjs tests/<name>.test.ts`.
- **Typechecking:** the cloud sandbox has `tsc` but no node_modules. Stage the files, write small `.d.ts` shims (react hooks, `next/server`, `@/lib/supabase`, other server modules), and run `tsc` with `paths: {"@/*": ["./repo/*"]}` (no `baseUrl`; TS 6 removed it). Errors left are only shim gaps (untyped event handlers, browser globals).

## Current product state
- **Discover:** sport pills under Sports (Soccer, Baseball & Softball, Basketball, Volleyball, Football, Lacrosse, Running, Roller Derby, …), a Rec / Club row, level tags and "Who can join" on cards, "Fees on their site" when no price. "Browsing for {child}" filters by age + interests.
- **Catalog:** 93 seed programs (Sports 24, 18 of them new for West Seattle/White Center on 2026-11-16) plus approved provider/agent listings. Seed fields `level` (`rec`/`club`) and `serves`.
- **Family dashboard:** Family Rhythm (week ahead, breathing room, clashes, Signup radar, Summer planner) above sync/alerts, profile and saved activities.
- **Date agent:** daily, reads every listing's site (HTML, PDF, iClassPro, JS via Cloudflare) and proposes dates; admins review in `/admin` → Agent.
- **Discovery agent (new):** 16 sports × 3 areas (West Seattle, Delridge, White Center), monthly per search, daily cron + "Find new providers" panel in the Agent tab. Finds clubs by web search, takes facts from their own sites, files new ones in Suggestions (inbox only; Evan approves). Untested against the live API.

## Where we stopped (2026-11-16, night)
Evan's new focus: **sports, especially club team sports, and ingesting more providers, starting with West Seattle zips.**

**For Evan to do:**
1. Run `supabase/discovery.sql` in Supabase, then `git push`.
2. `/admin` → Agent → Find new providers → **Run N due searches** (keep the tab open; ~20–50s each; ~$5–10 for all 48). Review Suggestions: Add or Dismiss.
3. Look at Discover → Sports (sport pills, Rec/Club row, "Who can join", "Fees on their site").

**Still to confirm from before:** the pencilled camp shows "For Ella" in saved; Erase from plan reopens the week; Pottery can be assigned to a child; Remind me on a dated signup; no Creative Care in summer ideas.

## Next up
1. Provider listing form asks for level + who can join (Sports); claimed seed listings keep `level`/`serves` (add to `seedToSubmissionRow` now that the columns exist).
2. Tryout dates as their own kind (date agent extracts them; Signup radar + alert emails show them).
3. Verify the 3 assumed age ranges (Highline Premier FC, Southwest LL, Seattle Volleyball Academy); martial arts studios via discovery.
4. After West Seattle looks good: more areas; consider auto-add for solid suggestions.
5. Earlier list: family signup asks interests per child; smarter weekly ideas; Step B phone-calendar check; date agent first-pass cleanup; launch-readiness (honesty pass, outreach kit, small fixes).

# Little Sound: handoff for a new chat (updated 2026-11-16, Summer planner live)

Read this first, then `BUILD_STATUS.md` (the repo's source of truth; a copy is in this Project). Both live in the repo on Evan's PC.

## Where things are
- **Code:** GitHub `thelittlesound/littlesound-landing`. Every push to `main` deploys to Vercel (Hobby plan). The site is still behind a password gate.
- **Evan's local repo:** `C:\Users\esher\OneDrive\Desktop\Little Sound\littlesound-landing-page`. In a linked session's device shell it is `$HOME/mnt/Little Sound/littlesound-landing-page`.
- **Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase. Email goes through Resend, AI through Anthropic, and pages that need JavaScript to show their schedules are read with the Cloudflare Browser Run `/content` endpoint.
- **Secrets live only in Vercel env vars:** `ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN` (Sensitive), `CLOUDFLARE_ACCOUNT_ID`, `CRON_SECRET`, Supabase keys. Never ask for them in chat or put them in the repo.
- **Pushed and live:** everything through `73016c7` (Summer planner), plus the handoff docs commit after it. If `git status -sb` shows `ahead`, ask Evan to push.
- **Database:** every SQL file is applied, including `saved_activities.kid_id`, `calendar_picks.kid_id`, `signup_reminders` and `summer_plans`.

## How we work (Evan's rules)
- Claude commits locally on Evan's PC; **Evan runs `git push`** himself. The cloud sandbox can't reach GitHub.
- If a commit fails with "Another git process seems to be running", ask Evan to `del` the `.git\*.lock` file in PowerShell.
- On server components that show live per-user data (dashboards, admin), add `export const dynamic = 'force-dynamic'`, and use plain `<a>` tags (not `<Link>`) for navigation after a mutation.
- Any new `supabase.auth.signUp()` flow must check `data.user.identities.length === 0` to catch duplicate emails.
- Commit trailers: `Co-Authored-By: Claude …` plus the session link given by the attribution reminder.
- Show Evan a mockup before shipping anything big and visual. He likes bold, distinctive UX ("lead with creativity and the user experience").
- Schema changes are SQL Evan runs in the Supabase SQL editor. Always end with `notify pgrst, 'reload schema';`. Code should fall back gracefully until the SQL has run.

## Gotchas learned the hard way
- **Supabase types each query by its select string.** Don't reassign a fallback query's result into the first query's variable; Vercel's build fails. Keep separate `first` and `fallback` results.
- **`profiles` has no client insert policy.** Profile rows are created server-side. The admin account (Evan's) had none, so browser `.update()` silently saved nothing. Saves now go through `POST /api/families/profile` (service-role upsert).
- **CRLF files:** `app/discover/page.tsx`, privacy and terms. Edit them with Python using `newline=''`, and convert to LF and back.
- **Moving files to Evan's PC:** tar the changed files, then `device_commit_files` to `...\Little Sound\<unique-name>.tgz` (use a **new file name each time**; reusing a name delivered a stale bundle once). Then in the device shell: extract, `rm` the tgz, compare sha256 with the sandbox, check `git status`, commit.

## Testing
- **Pure-logic tests** are in `tests/*.test.ts`: calendar-grid, family-rhythm, alerts, family-profile, kid-match, summer (148 checks). Run them with `bash tests/run.sh`; it needs Node and esbuild.
- **Typechecking in the cloud sandbox:** npm is blocked there. Use tsc with a sandbox tsconfig and shims for react, next, supabase and node globals. These aren't in the repo, so rebuild them if needed.
- **Previews:** render components with esbuild + react-dom, compile Tailwind v4 via `tailwindcss/dist/lib.js` `compile` (don't split tokens on commas), and screenshot with Playwright.

## Current product state (family side)
- **Discover:** a "Save for {child}" button on each card. When a signed-in family has named kids, a **"Browsing for"** row filters by that child's age and interests (`lib/kid-match.ts`). `?for=<kid id>` selects the child.
- **Family dashboard:** **Family Rhythm** sits on top (`FamilyRhythm.tsx`, `lib/family-rhythm.ts`):
  - a greeting and a one-line summary of the week
  - a breathing-room card per child, each with a "Find activities for {child}" button
  - clash cards with a fix
  - Signup radar with Remind me
  - "The week ahead" lanes per child (rolling 7 days), with ideas
  - a phone day strip
  - a switch to the **Summer planner**: 10 summer weeks × kids, with covered and open weeks, ideas per open week, and Pencil in (`SummerPlanner.tsx`, `lib/summer.ts`, `/api/families/summer`, `summer_plans` table)

  Below it:
  - the collapsed "Sync to your phone & email alerts" panel (ICS feed, alert emails)
  - the profile, with your first name and per-child name, age and interests
  - saved activities, each tagged "For {child}" when saved for one, with a session picker

  Kids have stable ids `k_xxxxxxxx` in `profiles.kids` and colors by order.
- **Date agent:** a daily cron reads providers' sites (HTML, PDF, iClassPro, JS via Cloudflare) and proposes dates. Admins review them in `/admin`. Eight sites block bots, and we respect that.

## Where we stopped (2026-11-16)
Family Rhythm Rounds 1 and 2 are live, and Evan tested them on the live site. The Summer planner is in use: Ella's Jul 5 week has Hands-On Science Camps pencilled in.

**Still to confirm** (ask Evan to check):

- the pencilled camp is in the saved list as "For Ella"
- Erase from plan reopens the week
- the Pottery class can be assigned to a child
- Remind me works on a dated signup

**Decided 2026-11-16:** add-on care (Gage "Creative Care") is left out of summer ideas, and open weeks show the top idea's name with "+N more →". Built; check it live after the push.

## Next up (see BUILD_STATUS "Next Up" for the full list)
1. Finish the remaining checks above (and look at the new open-week cells).
2. Family signup: ask for interests per child (the dashboard already does).
3. Family Rhythm: smarter weekly ideas beyond the saved list, using each child's interests.
4. Step B check: subscribe from a real phone calendar and watch the first alert emails.
5. Finish the date agent's first pass (the 13 drafts in the review inbox, stale URLs). Then the launch-readiness items: the honesty pass on placeholder stats, the provider outreach kit, and the small fixes.

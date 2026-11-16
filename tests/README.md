# Logic tests

Plain Node tests for the pure logic behind the family calendar and Family Rhythm (no database, no network). They're kept out of the Next.js build (`tsconfig.json` excludes `tests/`).

Run (needs Node; installs nothing into the app):

    npm i --no-save esbuild && bash tests/run.sh

- `calendar-grid.test.ts`: which days each kind of session falls on (matches the phone calendar feed), overlaps, kids' ids/colors.
- `family-rhythm.test.ts`: week by child, breathing room, clashes with fixes, signup radar, ideas, the summary line.
- `alerts.test.ts`: registration emails (opens soon / day before with "Remind me" / morning of).

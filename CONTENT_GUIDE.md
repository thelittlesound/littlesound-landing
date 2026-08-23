# Little Sound — Content & Copy Guide

Where to find and edit the text on the site. No coding required for straightforward copy changes — just edit the file, save, and push (`git add . && git commit -m "..." && git push`); Vercel auto-deploys in about a minute.

For what pages/features exist today, see `README.md`. For open items and fabricated-stat cleanup still pending before going public, see the "Before going public again" section of `BUILD_STATUS.md`.

---

## Homepage (`app/page.tsx` + `app/components/`)

| Section | File | What's there |
|---|---|---|
| Hero | `app/components/Hero.tsx` | Main headline, subheadline, waitlist form |
| Problem | `app/components/Problem.tsx` | Pain points grid |
| Solution | `app/components/Solution.tsx` | 3-step "Discover, Compare, Book" features |
| Founders | `app/components/Founders.tsx` | Kelly & Evan's origin story |
| Categories | `app/components/Categories.tsx` | Activity category grid with live counts pulled from real data |
| Providers | `app/components/Providers.tsx` | "For Providers" homepage section, CTA buttons to `/providers/signup` |
| CTA | `app/components/CTA.tsx` | Closing call-to-action, stats |
| Footer | `app/components/Footer.tsx` | Site-wide footer links |
| Nav | `app/components/Nav.tsx` | Site-wide nav — Browse Activities, For Families, For Providers, sign-in links |

**⚠️ Known copy issue:** `Hero.tsx`, `CTA.tsx`, `for-families/page.tsx`, `for-providers/page.tsx`, `about/page.tsx`, and `providers/signup/page.tsx` currently contain aspirational stats ("100+ families," "57+ providers verified") that aren't real yet — no real signups exist. Don't add to this language, and see `BUILD_STATUS.md` for the plan to replace it with honest numbers before the site goes public.

---

## Static marketing pages

- `app/for-families/page.tsx` — For Families page, includes both waitlist and "Create Your Account" CTAs
- `app/for-providers/page.tsx` — For Providers page
- `app/about/page.tsx` — About / founder story
- `app/terms/page.tsx` — Terms of Service (includes anti-scraping / AI-training language — don't loosen this without checking with Evan first)
- `app/privacy/page.tsx` — Privacy Policy (describes what's actually collected for family/provider accounts — keep this accurate if the account system's data model changes)

---

## Product pages (not just marketing copy — these have real functionality)

These pages are functional flows, not static content, so copy changes here should be tested, not just pushed blind:

- `app/discover/page.tsx` — family-facing search/browse page
- `app/families/signup/`, `app/families/login/`, `app/families/dashboard/` — family account flow
- `app/providers/signup/`, `app/providers/login/`, `app/providers/dashboard/`, `app/providers/listings/new/` — provider account + listing flow
- `app/admin/` — internal admin panel (not public-facing copy, but keep in mind Kelly/Evan use this daily)

---

## Colors, fonts, spacing

All defined in `little-sound-design-tokens.css` and `tailwind.config.js` — this is the single source of truth per the brand design system. Don't hardcode colors in individual components; use the existing Tailwind classes/tokens.

- Primary: Dark Teal `#0D5C6E`, Medium Teal `#1A7A8A`, Blue-Grey `#C5D8E8`, Cream `#F5EFE0`
- Gold accent: `#C4A882`
- Display font (headlines): Cormorant Garamond
- Body/UI font: DM Sans

---

## Images

- Hero image: `/public/images/hero.jpg` (1920×1080)
- Founders photo: `/public/images/family.jpg` (1080×1080)
- OG/social share image: `/public/og-image.png` (1200×630)

Pacific Northwest outdoor aesthetic, warm golden-hour lighting, candid family moments, rounded corners — per brand imagery guidelines.

---

## Data

`app/data/activities.json` — static seed listings (81 entries as of last count), merged at request time with live approved provider submissions from Supabase via `/api/activities`. Edit this file directly for corrections to seed data; real provider listings are managed through the admin panel, not this file.

---

## If something breaks after a copy change

- Check the browser console (F12 → Console) for errors
- Revert the specific commit on GitHub, or `git revert` — Vercel will redeploy the previous working version automatically
- For anything touching a form, signup flow, or dashboard (not pure marketing copy), test the flow end-to-end after deploying, not just that the page renders

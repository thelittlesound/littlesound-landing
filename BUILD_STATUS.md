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

## Last Completed Work
**Provider registration flow** — self-serve provider onboarding (no more emailing hello@).

New files:
| File | Route | Purpose |
|------|-------|---------|
| `app/providers/signup/page.tsx` | `/providers/signup` | Provider account form (name, email, business, category) |
| `app/providers/listings/new/page.tsx` | `/providers/listings/new` | 4-step listing creation (details → age/pricing → location → review) |
| `app/api/providers/submit/route.ts` | `POST /api/providers/submit` | Adds to Brevo provider list + emails hello@ with full details |

Flow: signup → passes name/email/category as URL params → listing form (pre-filled) → submit → success screen.
Email notifications go to hello@thelittlesound.com via Brevo transactional API.
Set `BREVO_PROVIDER_LIST_ID` in Vercel env vars (default falls back to list 3).

Previous work:
- Data verification pass on top 15 listings
- Static pages: `/for-families`, `/for-providers`, `/about`
- Site-wide nav (`app/components/Nav.tsx`) — fixed top, mobile hamburger
- Homepage flow restructured: Hero → Problem → Solution → Categories → Founders → Providers → CTA

---

## Next Up
- Add `/providers/signup` and `/providers/listings/new` links to the Nav and For Providers page CTA
- Set `BREVO_PROVIDER_LIST_ID` env var in Vercel dashboard
- Family auth flow (waitlist-only for beta or full signup?)
- Provider dashboard (view/edit listing after submission)

---

## Open Decisions
- Provider registration: store submissions in a database (Supabase recommended) or email-based for now?
- Family registration: full auth flow vs. waitlist-only for beta
- Booking: not in scope for Phase 1
- Stack for provider CRM: TBD post-launch

---

## Key Files
| File | Purpose |
|------|---------|
| `app/page.tsx` | Homepage — imports all section components |
| `app/discover/page.tsx` | Discover/search page — main family-facing product |
| `app/data/activities.json` | All activity listings (81 entries) |
| `app/components/Nav.tsx` | Site-wide fixed navigation |
| `app/components/Hero.tsx` | Homepage hero section |
| `app/components/Categories.tsx` | Homepage category grid with live counts |
| `app/components/Providers.tsx` | Homepage For Providers section |
| `app/components/Footer.tsx` | Site-wide footer |
| `app/for-families/page.tsx` | For Families static page |
| `app/for-providers/page.tsx` | For Providers static page |
| `app/about/page.tsx` | About static page |
| `app/api/waitlist/route.ts` | Waitlist API route (Brevo integration) |
| `little-sound-design-tokens.css` | Design system — colors, fonts, spacing |
| `tailwind.config.js` | Tailwind config (includes scrollbar-hide plugin) |

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

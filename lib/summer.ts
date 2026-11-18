// Family Rhythm, Round 2: the Summer planner. Pure and client-safe; the
// server route (/api/families/summer) feeds it the catalog, dates and plans.
//
// Ten summer weeks × each child. A week is covered when a dated session the
// family added (calendar_picks) runs that week for that child, or when they
// "pencilled in" a camp (summer_plans). Open weeks offer ideas: camps that fit
// the child, ranked by "runs that week", interests, and what they saved.

import { formatDay, formatTime, type DateItem } from '@/lib/activity-dates';
import { occurrences } from '@/lib/calendar-grid';
import { plusDays, weekdayOf } from '@/lib/ics';
import { categoriesFor, ageFits, matchesInterest } from '@/lib/kid-match';
import { campWhens } from '@/lib/camps';

export const SUMMER_WEEKS = 10;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface SummerWeek {
  /** Monday, YYYY-MM-DD. */
  start: string;
  /** "Jun 21" */
  label: string;
  /** "Jul 4 holiday" etc., or "". */
  note: string;
}

const md = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

/** A fixed-date holiday as observed on a weekday (Sat → Fri, Sun → Mon). */
function observed(iso: string): string {
  const w = weekdayOf(iso);
  return w === 'SA' ? plusDays(iso, -1) : w === 'SU' ? plusDays(iso, 1) : iso;
}

/**
 * The summer to plan: this year's until the end of August, then next year's.
 * Ten weeks from the first Monday on or after June 18 (Seattle schools finish
 * mid-June and start again around Labor Day).
 */
export function summerWeeks(today: string): { year: number; weeks: SummerWeek[] } {
  const y = Number(today.slice(0, 4));
  const year = today.slice(5) > '08-31' ? y + 1 : y;
  let first = `${year}-06-18`;
  while (weekdayOf(first) !== 'MO') first = plusDays(first, 1);
  const july4 = observed(`${year}-07-04`);
  const juneteenth = observed(`${year}-06-19`);
  const weeks: SummerWeek[] = [];
  for (let i = 0; i < SUMMER_WEEKS; i++) {
    const start = plusDays(first, i * 7);
    const end = plusDays(start, 6);
    const note = july4 >= start && july4 <= end ? 'Jul 4 holiday' : juneteenth >= start && juneteenth <= end ? 'Juneteenth' : '';
    weeks.push({ start, label: md(start), note });
  }
  return { year, weeks };
}

/** Does a dated session meet on a weekday (or weekend) of this week? Undated weekly classes don't count. */
export function runsInWeek(item: DateItem, monday: string): boolean {
  if (item.kind !== 'session' || !item.start_date) return false;
  return occurrences(item, monday, plusDays(monday, 6), monday).length > 0;
}

/** Signup status for a listing, from its registration dates. */
export function signupLine(items: DateItem[], today: string): { text: string; opens: string | null; open: boolean } {
  const regs = items.filter((i) => i.kind === 'registration' && (i.start_date || i.end_date));
  const openNow = regs.find((r) => (r.start_date ?? '0000-00-00') <= today && (r.end_date ?? '9999-12-31') >= today);
  if (openNow) return { text: openNow.end_date ? `Signups open · close ${formatDay(openNow.end_date, today)}` : 'Signups open now', opens: null, open: true };
  const next = regs.filter((r) => r.start_date && r.start_date > today).sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0];
  if (next) return { text: `Signups open ${formatDay(next.start_date!, today)}${next.start_time ? ` at ${formatTime(next.start_time)}` : ''}`, opens: next.start_date, open: false };
  return { text: 'Signup date not posted yet', opens: null, open: false };
}

export interface CatalogItem {
  id: string;
  title: string;
  provider: string;
  category: string;
  subcategory?: string | null;
  neighborhood: string;
  ageMin: number;
  ageMax: number;
  website: string;
  /** Camps: what it's about (a Discover category or "All-around"). */
  theme?: string | null;
}

/**
 * Camps and other summer programs (what the planner suggests). A camp that
 * only runs on school breaks (e.g. a Thanksgiving day camp) isn't a summer week.
 */
export function isSummerProgram(a: Pick<CatalogItem, 'category' | 'subcategory' | 'title'>): boolean {
  if (a.category === 'Camps') {
    const w = campWhens(a);
    return w.includes('Summer weeks') || w.includes('Overnight');
  }
  return /camp/i.test(a.subcategory ?? '') || /camp/i.test(a.title);
}

/**
 * Before-and-after care and extended-day add-ons (e.g. Gage "Creative Care").
 * They run during camp weeks but don't fill a week on their own, so the
 * planner doesn't suggest them. Judged by title and subcategory only: a camp
 * whose description mentions "before and after care available" is still a camp.
 */
const CARE_ADD_ON = /\b(before|after)[\s-]*(and|&)?[\s-]*(after[\s-]*)?(school|camp)?[\s-]*care\b|\baftercare\b|\bextended[\s-]*(day|care|hours)\b/i;
export function isAddOnCare(a: Pick<CatalogItem, 'subcategory' | 'title'>): boolean {
  const text = `${a.title} ${a.subcategory ?? ''}`;
  if (CARE_ADD_ON.test(text)) return true;
  // "Creative Care", "Camp Care": care in the name, and not a camp itself
  // ("Animal Care Camp" stays).
  return /\bcare\b/i.test(a.title) && !/\bcamps?\b/i.test(a.title);
}

export interface SummerKid {
  id: string;
  name: string;
  age: number | null;
  interests: string[];
}

export interface SummerIdea {
  activityId: string;
  title: string;
  provider: string;
  neighborhood: string;
  website: string;
  category: string;
  /** "Runs this week" when the listing has a dated session that week. */
  runs: boolean;
  /** Why it's suggested, e.g. "Runs this week · matches STEM". */
  why: string;
  signup: string;
  saved: boolean;
}

/**
 * Ideas for one child's open week, best first. Only listings that fit the
 * child's age; a listing with dated sessions none of which fall this week is
 * left out (it runs other weeks), while one with no summer dates yet stays in.
 */
export function summerIdeas(opts: {
  catalog: CatalogItem[];
  dates: Map<string, DateItem[]>;
  kid: SummerKid;
  week: SummerWeek;
  /** Activity ids saved by the family → kid id they were saved for (or null). */
  saved: Map<string, string | null>;
  /** Activity ids already pencilled in for this child (any week). */
  planned: Set<string>;
  /** The whole summer: first Monday … last Sunday. */
  window: { from: string; to: string };
  today: string;
  max?: number;
}): SummerIdea[] {
  const { catalog, dates, kid, week, saved, planned, window, today } = opts;
  const cats = categoriesFor(kid);
  const scored: { idea: SummerIdea; score: number }[] = [];
  for (const a of catalog) {
    const savedFor = saved.has(a.id) ? saved.get(a.id) : undefined;
    const isSaved = savedFor !== undefined;
    if (savedFor && savedFor !== kid.id) continue; // saved for a sibling
    if (isAddOnCare(a)) continue; // add-on care doesn't fill a week
    if (!isSummerProgram(a) && !isSaved) continue;
    if (!ageFits(a, kid.age)) continue;
    const items = dates.get(a.id) ?? [];
    const runs = items.some((i) => runsInWeek(i, week.start));
    // Its summer dates are posted and none fall this week: it runs other weeks.
    const summerDated = items.some(
      (i) => i.kind === 'session' && i.start_date && i.start_date <= window.to && (i.end_date ?? i.start_date) >= window.from
    );
    if (!runs && summerDated) continue;
    if (!runs && isSaved && !isSummerProgram(a)) continue; // a saved weekly class isn't a summer week
    const interest = matchesInterest(a, cats);
    const score = (runs ? 8 : 0) + (savedFor === kid.id ? 5 : isSaved ? 3 : 0) + (interest ? 4 : 0) + (planned.has(a.id) ? -6 : 0);
    const why = [runs ? 'Runs this week' : null, savedFor === kid.id ? `Saved for ${kid.name}` : isSaved ? 'You saved this' : null, interest ? `Matches ${kid.name}’s interests` : null]
      .filter(Boolean)
      .join(' · ');
    scored.push({
      score,
      idea: {
        activityId: a.id,
        title: a.title,
        provider: a.provider,
        neighborhood: a.neighborhood,
        website: a.website,
        category: a.category,
        runs,
        why: why || `Ages ${a.ageMin}–${a.ageMax}`,
        signup: signupLine(items, today).text,
        saved: isSaved,
      },
    });
  }
  scored.sort((x, y) => y.score - x.score || x.idea.title.localeCompare(y.idea.title));
  return scored.slice(0, opts.max ?? 5).map((s) => s.idea);
}

// ── What fills a week ────────────────────────────────────────────────────────

export interface SummerPlanRow {
  kid_id: string;
  week_start: string;
  activity_id: string;
  title: string | null;
  provider: string | null;
  website: string | null;
}

export interface WeekCell {
  kind: 'calendar' | 'pencil';
  activityId: string;
  title: string;
  provider: string | null;
  website: string | null;
  category: string | null;
  signup: string;
  /** Registration opening date, for "Remind me". */
  opens: string | null;
}

export interface PickLike {
  activityId: string;
  kidId: string | null;
  item: DateItem;
  title: string | null;
  provider: string | null;
  status?: string;
}

/** "kidId|weekStart" → what's in that week. A session on the calendar beats a pencilled plan. */
export function weekCells(opts: {
  weeks: SummerWeek[];
  plans: SummerPlanRow[];
  picks: PickLike[];
  dates: Map<string, DateItem[]>;
  /** Catalog lookups by activity id. */
  listings: Map<string, { website: string; category: string }>;
  today: string;
}): Record<string, WeekCell> {
  const { weeks, plans, picks, dates, listings, today } = opts;
  const cells: Record<string, WeekCell> = {};
  const starts = new Set(weeks.map((w) => w.start));
  for (const p of plans) {
    if (!starts.has(p.week_start)) continue;
    const s = signupLine(dates.get(p.activity_id) ?? [], today);
    cells[`${p.kid_id}|${p.week_start}`] = {
      kind: 'pencil',
      activityId: p.activity_id,
      title: p.title ?? 'Camp',
      provider: p.provider,
      website: p.website ?? listings.get(p.activity_id)?.website ?? null,
      category: listings.get(p.activity_id)?.category ?? null,
      signup: s.text,
      opens: s.opens,
    };
  }
  for (const p of picks) {
    if (!p.kidId || p.status === 'gone') continue;
    for (const w of weeks) {
      if (!runsInWeek(p.item, w.start)) continue;
      cells[`${p.kidId}|${w.start}`] = {
        kind: 'calendar',
        activityId: p.activityId,
        title: p.title ?? 'Activity',
        provider: p.provider,
        website: listings.get(p.activityId)?.website ?? null,
        category: listings.get(p.activityId)?.category ?? null,
        signup: 'On your calendar',
        opens: null,
      };
    }
  }
  return cells;
}

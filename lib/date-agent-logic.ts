// Pure decision logic for the date agent — no database, no network, so every
// rule is unit-testable. Safe to import from client components too.

import { formatDay, formatDays, formatTime, type DateItem } from '@/lib/activity-dates';

/** Dates the agent publishes are tagged approved_by "agent" or "agent·<admin email>" (approved from the inbox). */
export const AGENT = 'agent';
export function isAgentApproval(approvedBy: string | null | undefined): boolean {
  return !!approvedBy && approvedBy.startsWith(AGENT);
}

// ── Verifying quotes against the page ───────────────────────────────────────

/** Lowercase, plain quotes/dashes, single spaces — so formatting differences don't matter. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/…/g, '...')
    .replace(/[•·|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Is the AI's quote really on the page? Every fragment (split on "...", in
 * case it elided text) of at least 6 characters must appear in the page text.
 * This is the main guard against made-up dates.
 */
export function excerptOnPage(excerpt: string | null, normalizedPage: string): boolean {
  if (!excerpt) return false;
  const frags = normalizeForMatch(excerpt)
    .split('...')
    .map((f) => f.trim())
    .filter((f) => f.length >= 6);
  return frags.length > 0 && frags.every((f) => normalizedPage.includes(f));
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days)); // UTC: pure calendar math, no time zone involved
  return dt.toISOString().slice(0, 10);
}

/** Drop items that are entirely over. Ongoing weekly classes (no dates) stay. */
export function isPast(i: DateItem, today: string): boolean {
  const last = i.end_date ?? i.start_date;
  if (!last) return false;
  return last < today;
}

// ── Comparing schedules ──────────────────────────────────────────────────────

function key(i: DateItem): string {
  return [
    i.kind,
    i.start_date ?? '',
    i.end_date ?? '',
    (i.days_of_week ?? []).join(','),
    (i.start_time ?? '').slice(0, 5),
    (i.end_time ?? '').slice(0, 5),
  ].join('|');
}

/** Same dates/days/times, ignoring labels and notes (those vary run to run). */
export function sameSchedule(a: DateItem[], b: DateItem[]): boolean {
  if (a.length !== b.length) return false;
  const ka = a.map(key).sort();
  const kb = b.map(key).sort();
  return ka.every((k, i) => k === kb[i]);
}

// ── The decision ─────────────────────────────────────────────────────────────

export type Decision =
  | { action: 'publish'; reason: string }
  | { action: 'review'; reason: string }
  | { action: 'noop'; reason: string }
  | { action: 'none'; reason: string };

export const INFERRED_YEAR_WINDOW_DAYS = 90;

export function decide(opts: {
  items: DateItem[]; // already past-filtered
  yearInferred: boolean[]; // parallel to items
  verified: boolean[]; // parallel to items
  warnings: string[];
  current: DateItem[]; // what's live now (past-filtered)
  currentHumanEdited: boolean; // live dates were set by hand in the Dates tab
  today: string;
}): Decision {
  const { items, yearInferred, verified, warnings, current, currentHumanEdited, today } = opts;

  if (items.length === 0) {
    if (current.length === 0) return { action: 'none', reason: 'No upcoming dates for this listing on its site' };
    return {
      action: 'review',
      reason: `The site no longer shows the ${current.length} upcoming date${current.length === 1 ? '' : 's'} we have. Keep them, or clear them in the Dates tab?`,
    };
  }

  if (sameSchedule(items, current)) return { action: 'noop', reason: 'Dates unchanged' };

  if (currentHumanEdited && current.length > 0) {
    return { action: 'review', reason: 'You set this listing’s dates by hand; the agent found different ones' };
  }

  const unverified = verified.filter((v) => !v).length;
  if (unverified > 0) {
    return {
      action: 'review',
      reason: `${unverified} of ${items.length} date${items.length === 1 ? '' : 's'} couldn’t be matched word-for-word on the page`,
    };
  }

  const horizon = addDays(today, INFERRED_YEAR_WINDOW_DAYS);
  const riskyYear = items.some((it, i) => yearInferred[i] && (it.start_date ?? it.end_date ?? '') > horizon);
  if (riskyYear) {
    return {
      action: 'review',
      reason: 'The page doesn’t say the year for dates months away — it could be last year’s schedule',
    };
  }

  if (warnings.length > 0) return { action: 'review', reason: `The AI flagged: ${warnings[0]}` };

  return {
    action: 'publish',
    reason: `${items.length} verified date${items.length === 1 ? '' : 's'} published`,
  };
}

// ── Display ──────────────────────────────────────────────────────────────────

/** One readable line per item, for the review inbox. */
export function describeItem(i: DateItem, today: string): string {
  const t = (a: string | null, b: string | null) =>
    a ? ` ${formatTime(a)}${b ? `–${formatTime(b)}` : ''}` : '';
  const label = i.label ? `${i.label}: ` : '';
  if (i.kind === 'registration') {
    const opens = i.start_date ? `opens ${formatDay(i.start_date, today)}${i.start_time ? ` ${formatTime(i.start_time)}` : ''}` : '';
    const closes = i.end_date ? `closes ${formatDay(i.end_date, today)}${i.end_time ? ` ${formatTime(i.end_time)}` : ''}` : '';
    return `${label}Registration ${[opens, closes].filter(Boolean).join(', ')}`;
  }
  const days = i.days_of_week?.length ? ` ${formatDays(i.days_of_week)}` : '';
  if (!i.start_date && !i.end_date) return `${label}Weekly${days}${t(i.start_time, i.end_time)}`;
  const range =
    i.start_date && i.end_date && i.end_date !== i.start_date
      ? `${formatDay(i.start_date, today)} – ${formatDay(i.end_date, today)}`
      : formatDay((i.start_date ?? i.end_date)!, today);
  return `${label}${range}${days}${t(i.start_time, i.end_time)}`;
}

/** Same business + title → the same program, for de-duplicating suggestions. */
export function dedupeKey(business: string, title: string): string {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${n(business)}|${n(title)}`;
}

/** The same provider's other listings: same business name or same website host. */
export function sameProviderTitles(
  listing: { activityId: string; business: string; website: string | null },
  catalog: { activityId: string; business: string; title: string; website: string | null }[]
): string[] {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const host = (w: string | null) => {
    if (!w) return '';
    try {
      return new URL(/^https?:\/\//i.test(w) ? w : `https://${w}`).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  };
  const biz = n(listing.business);
  const h = host(listing.website);
  return [
    ...new Set(
      catalog
        .filter((l) => l.activityId !== listing.activityId && ((biz && n(l.business) === biz) || (h && host(l.website) === h)))
        .map((l) => l.title)
    ),
  ];
}

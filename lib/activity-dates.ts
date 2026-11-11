// Pure date helpers for the calendar agent — safe in client and server code.
//
// Every date here is a Seattle wall-clock "YYYY-MM-DD" string and every time
// is "HH:MM". They are compared as strings and formatted by hand. Never pass a
// date-only string through `new Date(...)`: "2027-03-03" parses as midnight
// UTC, which is still March 2 in Seattle, and every date would show a day early.

export type DateKind = 'session' | 'registration';
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
const DAY_NAMES: Record<string, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DateItem {
  kind: DateKind;
  label: string | null;
  start_date: string | null; // session start / registration opens
  end_date: string | null; // session end / registration closes
  days_of_week: string[] | null; // sessions only
  start_time: string | null; // "HH:MM", Seattle time
  end_time: string | null;
  location: string | null;
  notes: string | null;
  source_excerpt: string | null;
}

/** Today's date in Seattle as "YYYY-MM-DD", regardless of the server's zone. */
export function seattleToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "2027-03-03" → "Mar 3" (adds the year when it isn't the current one). */
export function formatDay(iso: string, today: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const label = `${MONTHS[m - 1]} ${d}`;
  return y === Number(today.slice(0, 4)) ? label : `${label}, ${y}`;
}

/** "09:00" or "09:00:00" → "9am"; "13:30" → "1:30pm". */
export function formatTime(t: string): string {
  const [h, min] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export function formatDays(days: string[]): string {
  return WEEKDAYS.filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(', ');
}

/**
 * The one line a family sees on a card: the most useful upcoming fact.
 * Registration beats sessions (it's the time-sensitive one). Returns null
 * when everything is in the past or there are no dates.
 */
export function summarize(items: DateItem[], today: string): string | null {
  const regs = items.filter((i) => i.kind === 'registration' && (i.start_date || i.end_date));

  // Registration open right now?
  const openNow = regs
    .filter((r) => (r.start_date ?? '0000-00-00') <= today && (r.end_date ?? '9999-12-31') >= today)
    .sort((a, b) => (a.end_date ?? '9999-12-31').localeCompare(b.end_date ?? '9999-12-31'))[0];
  if (openNow) {
    return openNow.end_date ? `Registration open · closes ${formatDay(openNow.end_date, today)}` : 'Registration open';
  }

  // Registration opening soon?
  const nextOpen = regs
    .filter((r) => r.start_date && r.start_date > today)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0];
  if (nextOpen) {
    const at = nextOpen.start_time ? ` at ${formatTime(nextOpen.start_time)}` : '';
    return `Registration opens ${formatDay(nextOpen.start_date!, today)}${at}`;
  }

  // Otherwise: the next or current session.
  const sessions = items
    .filter((i) => i.kind === 'session' && i.start_date && (i.end_date ?? i.start_date) >= today)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));
  const next = sessions[0];
  if (!next) return null;
  if (next.start_date! > today) return `Next session starts ${formatDay(next.start_date!, today)}`;
  if (next.days_of_week?.length) return `Running now · ${formatDays(next.days_of_week)}`;
  return 'Running now';
}

// ── Validation ───────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

function realDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); // UTC on purpose: only checking the calendar date exists
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function normTime(v: unknown): string | null | false {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return false;
  const m = TIME_RE.exec(v.trim());
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return false;
  return `${m[1]}:${m[2]}`;
}

function normText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/** Checks and normalizes one item. Returns the clean item or a reason it's invalid. */
export function validateItem(raw: unknown): DateItem | string {
  if (!raw || typeof raw !== 'object') return 'not an object';
  const r = raw as Record<string, unknown>;

  if (r.kind !== 'session' && r.kind !== 'registration') return 'kind must be session or registration';
  const kind = r.kind as DateKind;

  const start_date = r.start_date == null || r.start_date === '' ? null : String(r.start_date);
  const end_date = r.end_date == null || r.end_date === '' ? null : String(r.end_date);
  if (start_date && !realDate(start_date)) return `bad start date "${start_date}"`;
  if (end_date && !realDate(end_date)) return `bad end date "${end_date}"`;
  if (!start_date && !end_date) return 'needs at least a start or end date';
  if (start_date && end_date && end_date < start_date) return 'end date is before start date';

  const start_time = normTime(r.start_time);
  const end_time = normTime(r.end_time);
  if (start_time === false) return `bad start time "${String(r.start_time)}"`;
  if (end_time === false) return `bad end time "${String(r.end_time)}"`;

  let days_of_week: string[] | null = null;
  if (kind === 'session' && Array.isArray(r.days_of_week) && r.days_of_week.length) {
    const days = r.days_of_week.map((d) => String(d).toUpperCase().slice(0, 2));
    if (!days.every((d) => (WEEKDAYS as readonly string[]).includes(d))) return 'days must be MO–SU';
    days_of_week = WEEKDAYS.filter((d) => days.includes(d));
  }

  return {
    kind,
    label: normText(r.label, 200),
    start_date,
    end_date,
    days_of_week,
    start_time,
    end_time,
    location: normText(r.location, 300),
    notes: normText(r.notes, 500),
    source_excerpt: normText(r.source_excerpt, 300),
  };
}

export const MAX_ITEMS_PER_LISTING = 60;

/** All-or-nothing validation for saving: any bad item rejects the save. */
export function validateItems(raw: unknown): { items: DateItem[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: 'items must be a list' };
  if (raw.length > MAX_ITEMS_PER_LISTING) return { error: `at most ${MAX_ITEMS_PER_LISTING} dates per listing` };
  const items: DateItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const v = validateItem(raw[i]);
    if (typeof v === 'string') return { error: `Row ${i + 1}: ${v}` };
    items.push(v);
  }
  return { items };
}

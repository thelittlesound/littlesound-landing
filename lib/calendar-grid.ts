// The family dashboard's month calendar: which days each session falls on,
// what overlaps, and each child's color. Pure and client-safe.
//
// The day-by-day rules match the phone calendar feed (lib/ics.ts
// sessionTiming), so the dashboard and a subscribed calendar always agree:
// weekly classes repeat on their weekdays between their dates; an ongoing
// class with no dates repeats from an anchor day; a camp week with daily
// hours runs Mon–Fri when it starts and ends on weekdays (otherwise every
// day); an untimed date range covers every day in it.

import type { DateItem } from './activity-dates';
import { firstOnOrAfter, plusDays, weekdayOf } from './ics';

export interface Occurrence {
  date: string; // YYYY-MM-DD
  start: string | null; // "HH:MM", null = all day
  end: string | null;
}

const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MAX_PER_ITEM = 400; // safety cap for very long ranges

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Every day a session meets between `from` and `to` (inclusive). */
export function occurrences(item: DateItem, from: string, to: string, anchor: string): Occurrence[] {
  if (item.kind !== 'session') return [];
  const days = (item.days_of_week ?? []).filter((d) => WEEKDAY_CODES.includes(d));
  const start = item.start_time ?? null;
  const end = start ? (item.end_time && item.end_time > start ? item.end_time : addMinutes(start, 60)) : null;
  const out: Occurrence[] = [];
  const push = (date: string) => {
    if (date >= from && date <= to && out.length < MAX_PER_ITEM) out.push({ date, start, end });
  };

  let first: string;
  let last: string;
  let rule: (d: string) => boolean;
  if (!item.start_date) {
    if (!days.length) return [];
    first = firstOnOrAfter(anchor, days);
    last = to;
    rule = (d) => days.includes(weekdayOf(d));
  } else {
    const endDate = item.end_date && item.end_date >= item.start_date ? item.end_date : item.start_date;
    first = item.start_date;
    last = item.end_date ? endDate : days.length ? to : item.start_date;
    if (days.length) rule = (d) => days.includes(weekdayOf(d));
    else if (endDate > item.start_date && start) {
      const weekdaysOnly = !['SA', 'SU'].includes(weekdayOf(item.start_date)) && !['SA', 'SU'].includes(weekdayOf(endDate));
      rule = (d) => !weekdaysOnly || !['SA', 'SU'].includes(weekdayOf(d));
    } else rule = () => true;
  }
  // Walk only the overlap with the visible range.
  let d = first > from ? first : from;
  const stop = last < to ? last : to;
  for (let guard = 0; d <= stop && guard < 1000; guard++, d = plusDays(d, 1)) if (rule(d)) push(d);
  return out;
}

/** Monday-first weeks covering a month: [firstDay, lastDay] of the grid, plus the weeks. */
export function monthGrid(month: string): { from: string; to: string; weeks: string[][] } {
  const first = `${month}-01`;
  const offset = WEEKDAY_CODES.indexOf(weekdayOf(first));
  const from = plusDays(first, -offset);
  const nextMonth = plusDays(`${month}-28`, 4).slice(0, 7);
  const lastOfMonth = plusDays(`${nextMonth}-01`, -1);
  const endOffset = 6 - WEEKDAY_CODES.indexOf(weekdayOf(lastOfMonth));
  const to = plusDays(lastOfMonth, endOffset);
  const weeks: string[][] = [];
  for (let d = from; d <= to; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++, d = plusDays(d, 1)) week.push(d);
    weeks.push(week);
  }
  return { from, to, weeks };
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
const DAY_LONG: Record<string, string> = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday' };
export function dayLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${DAY_LONG[weekdayOf(date)]}, ${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}

// ── Overlaps ─────────────────────────────────────────────────────────────────

export interface Timed {
  id: string;
  start: string | null;
  end: string | null;
}
/** Do two same-day times overlap? All-day items never "clash" with anything. */
export function overlaps(a: Timed, b: Timed): boolean {
  if (!a.start || !b.start || !a.end || !b.end) return false;
  return a.start < b.end && b.start < a.end;
}
/** For each item id, the ids of other items it overlaps (same day). */
export function clashMap<T extends Timed>(items: T[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (!overlaps(items[i], items[j])) continue;
      out.set(items[i].id, [...(out.get(items[i].id) ?? []), items[j].id]);
      out.set(items[j].id, [...(out.get(items[j].id) ?? []), items[i].id]);
    }
  }
  return out;
}

// ── Kids ─────────────────────────────────────────────────────────────────────

export interface KidRaw {
  id?: string;
  name?: string;
  age?: number | string;
}
export interface Kid {
  id: string;
  name: string; // may be empty: then shown as "Age 9" / "Kid 2"
  age: number | null;
}

// Distinct, readable on white and cream; first is the brand teal.
// Not tan/gold: that's the registration color.
export const KID_COLORS = ['#0D5C6E', '#7B5EA7', '#2E7D5B', '#C0544A', '#3A6EA5', '#9C4F7E'];
export const UNASSIGNED_COLOR = '#6B7F8A';

export const KID_ID_RE = /^k_[a-z0-9]{4,16}$/;
export function newKidId(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)];
  return `k_${s}`;
}

/** Profile kids → kids with stable ids. `changed` = ids were added (save them). */
export function normalizeKids(raw: unknown, rand?: () => number): { kids: Kid[]; stored: KidRaw[]; changed: boolean } {
  const list = Array.isArray(raw) ? raw : [];
  let changed = false;
  const seen = new Set<string>();
  const stored: KidRaw[] = [];
  const kids: Kid[] = [];
  for (const r of list.slice(0, 12)) {
    if (!r || typeof r !== 'object') continue;
    const k = r as KidRaw;
    let id = typeof k.id === 'string' && KID_ID_RE.test(k.id) && !seen.has(k.id) ? k.id : '';
    if (!id) {
      id = newKidId(rand);
      changed = true;
    }
    seen.add(id);
    const age = Number(k.age);
    const name = typeof k.name === 'string' ? k.name.trim().slice(0, 40) : '';
    stored.push({ ...k, id });
    kids.push({ id, name, age: Number.isFinite(age) && String(k.age ?? '').trim() !== '' ? age : null });
  }
  return { kids, stored, changed };
}

export function kidLabel(k: Kid, index: number): string {
  return k.name || (k.age != null ? `Age ${k.age}` : `Kid ${index + 1}`);
}
export function kidColor(kids: Kid[], kidId: string | null | undefined): string {
  const i = kidId ? kids.findIndex((k) => k.id === kidId) : -1;
  return i >= 0 ? KID_COLORS[i % KID_COLORS.length] : UNASSIGNED_COLOR;
}

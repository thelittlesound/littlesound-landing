// Family Rhythm: the family dashboard's "where do things stand" view.
// Pure and client-safe; the dashboard component draws what this computes.
//
//   • the week by child (lanes), from the sessions a family added
//   • a one-line summary of the coming week
//   • "breathing room": how full each child's week is
//   • clashes, each with a fix (another session of the same class)
//   • the signup radar: registration openings / closings for saved activities
//   • ideas for open days: other sessions of activities they saved
//
// Day placement comes from lib/calendar-grid.ts `occurrences`, which uses the
// same rules as the phone calendar feed, so all three always agree.

import { formatDay, formatDays, formatTime, type DateItem } from './activity-dates';
import { occurrences, overlaps, type Kid } from './calendar-grid';
import { plusDays, weekdayOf } from './ics';

export interface RhythmActivity {
  activityId: string;
  title: string;
  provider: string | null;
  website: string | null;
  neighborhood: string | null;
  ageMin: number | null;
  ageMax: number | null;
  category?: string | null;
  /** Saved for this child (Discover's "Browsing for"); ideas go to them only. */
  forKid?: string | null;
}
export interface RhythmSession {
  key: string;
  text: string;
  item: DateItem;
}
export interface RhythmPick {
  activityId: string;
  key: string;
  status: 'active' | 'changed' | 'gone';
  changeNote: string | null;
  kidId: string | null;
  anchor: string;
}
export interface RhythmData {
  activities: RhythmActivity[];
  sessions: Record<string, RhythmSession[]>;
  registrations: Record<string, DateItem[]>;
  picks: RhythmPick[];
  kids: Kid[];
}

/** A picked session on one day. */
export interface RhythmEvent {
  id: string; // activityId|key|date
  activityId: string;
  key: string;
  lane: string; // kid id, or UNASSIGNED
  date: string;
  start: string | null;
  end: string | null;
  activity: RhythmActivity;
  session: RhythmSession;
  pick: RhythmPick;
}

export const UNASSIGNED = 'unassigned';
const WEEKDAY_NAMES: Record<string, string> = {
  MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
};

// ── Dates ────────────────────────────────────────────────────────────────────

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const back = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].indexOf(weekdayOf(date));
  return plusDays(date, -back);
}
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => plusDays(monday, i));
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
/** "today", "tomorrow", "Friday" (this week), or "Fri, Nov 27". */
export function dayWord(date: string, today: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1 && n < 7) return WEEKDAY_NAMES[weekdayOf(date)];
  return `${WEEKDAY_NAMES[weekdayOf(date)].slice(0, 3)}, ${formatDay(date, today)}`;
}
export function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Events ───────────────────────────────────────────────────────────────────

/** Every picked session that meets between `from` and `to`, sorted. */
export function rhythmEvents(data: RhythmData, from: string, to: string): RhythmEvent[] {
  const byId = new Map(data.activities.map((a) => [a.activityId, a]));
  const kidIds = new Set(data.kids.map((k) => k.id));
  const out: RhythmEvent[] = [];
  for (const p of data.picks) {
    if (p.status === 'gone') continue;
    const activity = byId.get(p.activityId);
    const session = data.sessions[p.activityId]?.find((s) => s.key === p.key);
    if (!activity || !session) continue; // unsaved since, or no longer upcoming
    const lane = p.kidId && kidIds.has(p.kidId) ? p.kidId : UNASSIGNED;
    for (const o of occurrences(session.item, from, to, p.anchor)) {
      out.push({ id: `${p.activityId}|${p.key}|${o.date}`, activityId: p.activityId, key: p.key, lane, date: o.date, start: o.start, end: o.end, activity, session, pick: p });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''));
}

/** Lanes to show: each child, plus "Not assigned" when anything is. */
export function lanes(kids: Kid[], events: RhythmEvent[]): string[] {
  const ids = kids.map((k) => k.id);
  return events.some((e) => e.lane === UNASSIGNED) || !kids.length ? [...ids, UNASSIGNED] : ids;
}

// ── Breathing room ───────────────────────────────────────────────────────────

export interface Breathing {
  hours: number;
  freeAfternoons: number; // weekdays in the window with nothing after 2pm
  word: 'Light' | 'Balanced' | 'Full';
  pct: number; // bar fill, 0–100
}
export const FULL_WEEK_HOURS = 6;
export function breathing(events: RhythmEvent[], lane: string, week: string[]): Breathing {
  const mine = events.filter((e) => e.lane === lane && week.includes(e.date));
  const minutes = mine.reduce((n, e) => {
    if (!e.start || !e.end) return n + 60; // all-day items count as an hour of "busy"
    const [sh, sm] = e.start.split(':').map(Number);
    const [eh, em] = e.end.split(':').map(Number);
    return n + Math.max(0, eh * 60 + em - (sh * 60 + sm));
  }, 0);
  const hours = Math.round((minutes / 60) * 10) / 10;
  // Weekdays in the window (it can start on any day: the dashboard shows the next 7 days).
  const freeAfternoons = week
    .filter((d) => !['SA', 'SU'].includes(weekdayOf(d)))
    .filter((d) => !mine.some((e) => e.date === d && (!e.start || e.start >= '14:00' || (e.end ?? '') > '14:30'))).length;
  const word = hours > FULL_WEEK_HOURS ? 'Full' : hours >= 2 ? 'Balanced' : 'Light';
  return { hours, freeAfternoons, word, pct: Math.min(100, Math.max(hours ? 8 : 0, Math.round((hours / FULL_WEEK_HOURS) * 100))) };
}

// ── Clashes, with a fix ──────────────────────────────────────────────────────

export interface Clash {
  key: string; // stable id (for "keep both")
  lane: string;
  date: string;
  a: RhythmEvent;
  b: RhythmEvent;
  /** Another session of one of the two classes that doesn't clash. */
  fix: { move: RhythmEvent; to: RhythmSession; label: string } | null;
}

/** "Sat 9:30am", "Tue, Thu 4pm", "Jan 6 2:30pm" */
export function sessionShort(item: DateItem, today: string): string {
  const t = item.start_time ? ` ${formatTime(item.start_time)}` : '';
  if (item.days_of_week?.length) return `${formatDays(item.days_of_week)}${t}`;
  if (item.start_date) return `${formatDay(item.start_date, today)}${t}`;
  return `Weekly${t}`;
}

/**
 * Overlapping sessions for the same child between `from` and `to` (two
 * different children at once isn't a clash: two grown-ups can drive). Each
 * comes with a fix when one of the two classes has another session that
 * doesn't overlap anything else that child has in the next four weeks.
 */
export function clashes(data: RhythmData, from: string, to: string, today: string): Clash[] {
  const events = rhythmEvents(data, from, to);
  const out: Clash[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.date !== b.date || a.lane !== b.lane || a.key === b.key) continue;
      if (!overlaps({ id: a.id, start: a.start, end: a.end }, { id: b.id, start: b.start, end: b.end })) continue;
      const key = [a.activityId + '|' + a.key, b.activityId + '|' + b.key].sort().join('~');
      if (seen.has(key)) continue; // a weekly clash shows once
      seen.add(key);
      out.push({ key, lane: a.lane, date: a.date, a, b, fix: findFix(data, a, b, today) });
    }
  }
  return out;
}

function findFix(data: RhythmData, a: RhythmEvent, b: RhythmEvent, today: string): Clash['fix'] {
  const horizonTo = plusDays(today, 27);
  const others = rhythmEvents(data, today, horizonTo).filter((e) => e.lane === a.lane);
  const picked = new Set(data.picks.filter((p) => p.status !== 'gone').map((p) => `${p.activityId}|${p.key}`));
  for (const move of [b, a]) {
    const keep = others.filter((e) => !(e.activityId === move.activityId && e.key === move.key));
    for (const s of data.sessions[move.activityId] ?? []) {
      if (s.key === move.key || picked.has(`${move.activityId}|${s.key}`)) continue;
      const occ = occurrences(s.item, today, horizonTo, today);
      if (!occ.length) continue;
      const clashesAgain = occ.some((o) => keep.some((e) => e.date === o.date && overlaps({ id: 'x', start: o.start, end: o.end }, { id: e.id, start: e.start, end: e.end })));
      if (!clashesAgain) return { move, to: s, label: sessionShort(s.item, today) };
    }
  }
  return null;
}

// ── Signup radar ─────────────────────────────────────────────────────────────

export interface RadarItem {
  id: string; // activityId|opens|date
  activity: RhythmActivity;
  kind: 'opens' | 'closes';
  date: string;
  time: string | null;
  days: number; // from today
  label: string | null;
  /** Kids whose age fits the activity (empty = unknown or none). */
  forKids: Kid[];
}

export function kidsFor(a: RhythmActivity, kids: Kid[]): Kid[] {
  const chosen = a.forKid ? kids.filter((k) => k.id === a.forKid) : [];
  if (chosen.length) return chosen; // saved for this child
  if (a.ageMin == null && a.ageMax == null) return [];
  return kids.filter((k) => k.age != null && k.age >= (a.ageMin ?? 0) && k.age <= (a.ageMax ?? 99));
}

/** Openings still to come (soonest first), then registrations open now that close soonest. */
export function radar(data: RhythmData, today: string, max = 8): RadarItem[] {
  const opens: RadarItem[] = [];
  const closes: RadarItem[] = [];
  for (const a of data.activities) {
    for (const r of data.registrations[a.activityId] ?? []) {
      if (r.kind !== 'registration') continue;
      const base = { activity: a, label: r.label, forKids: kidsFor(a, data.kids) };
      if (r.start_date && r.start_date >= today) {
        opens.push({ ...base, id: `${a.activityId}|opens|${r.start_date}`, kind: 'opens', date: r.start_date, time: r.start_time, days: daysBetween(today, r.start_date) });
      } else if (r.end_date && r.end_date >= today) {
        closes.push({ ...base, id: `${a.activityId}|closes|${r.end_date}`, kind: 'closes', date: r.end_date, time: r.end_time, days: daysBetween(today, r.end_date) });
      }
    }
  }
  opens.sort((x, y) => x.date.localeCompare(y.date));
  closes.sort((x, y) => x.date.localeCompare(y.date));
  return [...opens, ...closes].slice(0, max);
}

/** Saved activities with no registration dates posted yet (the agent keeps checking). */
export function watching(data: RhythmData): RhythmActivity[] {
  return data.activities.filter((a) => !(data.registrations[a.activityId] ?? []).length && !(data.sessions[a.activityId] ?? []).length);
}

// ── Ideas for open days ──────────────────────────────────────────────────────

export interface Idea {
  activity: RhythmActivity;
  session: RhythmSession;
  date: string;
  start: string | null;
  end: string | null;
}

/**
 * One idea for a child's empty day: a session of something the family saved
 * (not already added) that meets that day and fits the child's age.
 */
export function ideaFor(data: RhythmData, lane: string, date: string, events: RhythmEvent[]): Idea | null {
  if (lane === UNASSIGNED) return null;
  if (events.some((e) => e.lane === lane && e.date === date)) return null;
  const kid = data.kids.find((k) => k.id === lane);
  const picked = new Set(data.picks.filter((p) => p.status !== 'gone').map((p) => `${p.activityId}|${p.key}`));
  const pickedActivities = new Set(data.picks.filter((p) => p.status !== 'gone').map((p) => p.activityId));
  let best: Idea | null = null;
  for (const a of data.activities) {
    if (kid && kid.age != null && (a.ageMin != null || a.ageMax != null) && (kid.age < (a.ageMin ?? 0) || kid.age > (a.ageMax ?? 99))) continue;
    if (pickedActivities.has(a.activityId)) continue; // already doing this one
    if (a.forKid && a.forKid !== lane && data.kids.some((k) => k.id === a.forKid)) continue; // saved for a sibling
    for (const s of data.sessions[a.activityId] ?? []) {
      if (picked.has(`${a.activityId}|${s.key}`)) continue;
      const o = occurrences(s.item, date, date, date)[0];
      if (!o) continue;
      if (!best || (o.start ?? '') < (best.start ?? '')) best = { activity: a, session: s, date, start: o.start, end: o.end };
    }
  }
  return best;
}

// ── The one-line summary ─────────────────────────────────────────────────────

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const n2w = (n: number) => NUM[n] ?? String(n);

/**
 * "A full Wednesday, a wide-open Thursday, and one signup to catch on Friday."
 * Looks at the next seven days, starting today.
 */
export function summaryLine(data: RhythmData, today: string, clashCount = 0): string {
  const days = weekDays(today);
  const events = rhythmEvents(data, today, days[6]);
  const signups = radar(data, today).filter((r) => r.kind === 'opens' && r.days <= 6);
  const parts: string[] = [];

  const perDay = days.map((d) => ({ d, n: events.filter((e) => e.date === d).length }));
  const busiest = [...perDay].sort((x, y) => y.n - x.n)[0];
  if (busiest.n >= 2) parts.push(`a full ${dayWord(busiest.d, today) === 'today' ? 'day today' : dayWord(busiest.d, today) === 'tomorrow' ? 'day tomorrow' : dayWord(busiest.d, today)}`);
  else if (events.length) parts.push(`${n2w(events.length)} ${events.length === 1 ? 'activity' : 'activities'} on the calendar`);

  const quiet = perDay.find((x) => x.n === 0 && x.d !== today && !['SA', 'SU'].includes(weekdayOf(x.d)));
  if (events.length && quiet) parts.push(`a wide-open ${dayWord(quiet.d, today)}`);

  if (clashCount) parts.push(`${n2w(clashCount)} ${clashCount === 1 ? 'clash' : 'clashes'} to sort out`);
  if (signups.length === 1) parts.push(`one signup to catch ${['today', 'tomorrow'].includes(dayWord(signups[0].date, today)) ? dayWord(signups[0].date, today) : `on ${dayWord(signups[0].date, today)}`}`);
  else if (signups.length > 1) parts.push(`${n2w(signups.length)} signups to catch this week`);

  if (!parts.length) {
    return data.activities.length
      ? 'A quiet week ahead. Add sessions from your saved activities to see them here.'
      : 'A quiet week ahead. Save activities on Discover and they’ll show up here.';
  }
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}${parts.length > 2 ? ',' : ''} and ${parts[parts.length - 1]}`;
  return text[0].toUpperCase() + text.slice(1) + '.';
}

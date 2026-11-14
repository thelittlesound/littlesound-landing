// Family calendar logic: which sessions a family picked, how those picks
// follow a listing's dates when they change, which registration alerts are
// due, and the calendar events for all of it. Pure and client-safe.

import { formatDay, formatTime, type DateItem } from './activity-dates';
import { describeItem, isPast, addDays } from './date-agent-logic';
import { momentTiming, sessionTiming, type IcsEvent } from './ics';

/**
 * Identifies a session by when it happens (not its label): dates, weekdays and
 * times. activity_dates rows get new ids whenever a listing's dates are
 * replaced, so picks are matched to the current dates by this key.
 */
export function sessionKey(i: DateItem): string {
  return [
    i.start_date ?? '',
    i.end_date ?? '',
    [...(i.days_of_week ?? [])].sort().join(','),
    i.start_time ?? '',
    i.end_time ?? '',
  ].join('|');
}

/** Upcoming sessions, soonest first (ongoing weekly classes last), one per key. */
export function upcomingSessions(items: DateItem[], today: string): DateItem[] {
  const seen = new Set<string>();
  return items
    .filter((i) => i.kind === 'session' && !isPast(i, today))
    .filter((i) => {
      const k = sessionKey(i);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999') || (a.start_time ?? '').localeCompare(b.start_time ?? ''));
}

const normLabel = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export type Reconciled =
  | { kind: 'same'; item: DateItem }
  | { kind: 'changed'; item: DateItem }
  | { kind: 'gone' }
  | { kind: 'past' };

/**
 * Matches a picked session against the listing's current dates:
 * same key → same session; otherwise the one current session with the same
 * label → it moved (changed); otherwise it's no longer listed (gone).
 */
export function reconcile(picked: DateItem, current: DateItem[], today: string): Reconciled {
  if (isPast(picked, today)) return { kind: 'past' };
  const sessions = current.filter((c) => c.kind === 'session');
  const key = sessionKey(picked);
  const same = sessions.find((c) => sessionKey(c) === key);
  if (same) return { kind: 'same', item: same };
  const label = normLabel(picked.label);
  if (label) {
    const byLabel = sessions.filter((c) => normLabel(c.label) === label && !isPast(c, today));
    if (byLabel.length === 1) return { kind: 'changed', item: byLabel[0] };
  }
  return { kind: 'gone' };
}

// ── Registration alerts ─────────────────────────────────────────────────────

export const REG_ALERT_DAYS = 7;

export interface RegAlert {
  /** Unique per family in family_alert_log: never sent twice. */
  key: string;
  stage: 'soon' | 'today';
  date: string;
  time: string | null;
  label: string | null;
}

/**
 * Registration openings worth an email today: one "opens soon" alert when an
 * opening is 1–7 days away, and one "opens today" alert the morning of.
 */
export function registrationAlerts(activityId: string, items: DateItem[], today: string): RegAlert[] {
  const horizon = addDays(today, REG_ALERT_DAYS);
  const out: RegAlert[] = [];
  for (const i of items) {
    if (i.kind !== 'registration' || !i.start_date) continue;
    if (i.start_date < today || i.start_date > horizon) continue;
    const stage = i.start_date === today ? 'today' : 'soon';
    out.push({
      key: `reg|${activityId}|${i.start_date}|${i.start_time ?? ''}|${stage}`,
      stage,
      date: i.start_date,
      time: i.start_time,
      label: i.label,
    });
  }
  return out;
}

/** "today at 9am", "tomorrow", "in 3 days (Mar 3) at 9am" */
export function whenText(date: string, time: string | null, today: string): string {
  const at = time ? ` at ${formatTime(time)}` : '';
  if (date === today) return `today${at}`;
  if (date === addDays(today, 1)) return `tomorrow${at}`;
  const n = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return `in ${n} days (${formatDay(date, today)})${at}`;
}

export function describeSession(i: DateItem, today: string): string {
  return describeItem(i, today);
}

// ── Calendar events ─────────────────────────────────────────────────────────

/** Small stable hash for event UIDs (FNV-1a, hex). */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface CalendarActivity {
  activityId: string;
  title: string;
  provider: string | null;
  website: string | null;
  neighborhood: string | null;
}

function details(a: CalendarActivity, extra?: string | null): string {
  return [a.provider, extra, a.website, 'Added from Little Sound · thelittlesound.com'].filter(Boolean).join('\n');
}

/** The event for one picked session. `anchor` = day it was picked (for undated weekly classes). */
export function sessionEvent(a: CalendarActivity, item: DateItem, scope: string, anchor: string): IcsEvent | null {
  const timing = sessionTiming(item, anchor);
  if (!timing) return null;
  return {
    uid: `s-${hash(`${scope}|${a.activityId}|${sessionKey(item)}`)}@thelittlesound.com`,
    summary: item.label && !a.title.toLowerCase().includes(item.label.toLowerCase()) ? `${a.title}: ${item.label}` : a.title,
    description: details(a, item.notes),
    location: item.location ?? a.neighborhood ?? undefined,
    url: a.website ?? undefined,
    timing,
    alarmMinutes: 60,
  };
}

/** "Registration opens" (and "closes") events for a saved activity's upcoming registration windows. */
export function registrationEvents(a: CalendarActivity, items: DateItem[], scope: string, today: string): IcsEvent[] {
  const out: IcsEvent[] = [];
  for (const i of items) {
    if (i.kind !== 'registration') continue;
    if (i.start_date && i.start_date >= today) {
      out.push({
        uid: `ro-${hash(`${scope}|${a.activityId}|${i.start_date}|${i.start_time ?? ''}`)}@thelittlesound.com`,
        summary: `Registration opens: ${a.title}`,
        description: details(a, i.label),
        url: a.website ?? undefined,
        timing: momentTiming(i.start_date, i.start_time),
        alarmMinutes: 15,
      });
    }
    if (i.end_date && i.end_date >= today) {
      out.push({
        uid: `rc-${hash(`${scope}|${a.activityId}|${i.end_date}|${i.end_time ?? ''}`)}@thelittlesound.com`,
        summary: `Registration closes: ${a.title}`,
        description: details(a, i.label),
        url: a.website ?? undefined,
        timing: momentTiming(i.end_date, i.end_time),
      });
    }
  }
  return out;
}

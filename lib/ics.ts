// Builds iCalendar (.ics) files: the family subscription feed and one-off
// "download this session" files. Pure and client-safe (no Node APIs).
//
// All times are Seattle wall-clock, written with TZID=America/Los_Angeles and
// a VTIMEZONE block, so every calendar app shows them at the right local time
// across daylight-saving changes. Dates are "YYYY-MM-DD" strings handled by
// hand (see lib/activity-dates.ts for why we never parse them with new Date).

import type { DateItem } from './activity-dates';

const TZID = 'America/Los_Angeles';
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0800',
  'TZOFFSETTO:-0700',
  'TZNAME:PDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0700',
  'TZOFFSETTO:-0800',
  'TZNAME:PST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']; // index = getUTCDay()

// ── Date arithmetic on "YYYY-MM-DD" (UTC math, no time zones involved) ──────

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}
export function weekdayOf(iso: string): string {
  const [y, m, d] = parts(iso);
  return WEEKDAY_CODES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
export function plusDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** First date on or after `from` whose weekday is in `days`. */
export function firstOnOrAfter(from: string, days: string[]): string {
  for (let i = 0; i < 7; i++) {
    const d = plusDays(from, i);
    if (days.includes(weekdayOf(d))) return d;
  }
  return from;
}
const compact = (iso: string) => iso.replace(/-/g, '');
const hhmm = (t: string) => t.replace(':', '').slice(0, 4);
/** "HH:MM" + minutes → "HH:MM" (clamped to the same day). */
function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Text ────────────────────────────────────────────────────────────────────

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line to 75 octets per RFC 5545 (continuation lines start with a space). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of Array.from(line)) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines lose one octet to the leading space
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

// ── Events ──────────────────────────────────────────────────────────────────

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  /** Lines from eventTiming(): DTSTART, DTEND and optionally RRULE. */
  timing: string[];
  /** Minutes before start for a reminder (timed events only). */
  alarmMinutes?: number;
}

/**
 * DTSTART/DTEND/RRULE lines for a session, or null if it can't be placed on a
 * calendar (e.g. no dates and no weekdays). `anchor` is used for an ongoing
 * weekly class with no dates: the series starts on the first matching day on
 * or after it (pass the day the family added it, so the feed stays stable).
 */
export function sessionTiming(item: DateItem, anchor: string): string[] | null {
  const days = (item.days_of_week ?? []).filter((d) => WEEKDAY_CODES.includes(d));
  const timed = !!item.start_time;
  const startT = item.start_time ?? '';
  const endT = item.end_time && item.start_time && item.end_time > item.start_time ? item.end_time : timed ? addMinutes(startT, 60) : '';

  let first: string;
  let rrule: string | null = null;
  let lastDay: string | null = null; // for an all-day span with no rule

  if (!item.start_date) {
    // Ongoing weekly class with no stated dates.
    if (!days.length) return null;
    first = firstOnOrAfter(anchor, days);
    rrule = `FREQ=WEEKLY;BYDAY=${days.join(',')}`;
  } else {
    const end = item.end_date && item.end_date >= item.start_date ? item.end_date : null;
    if (days.length) {
      first = firstOnOrAfter(item.start_date, days);
      if (end && first > end) return null;
      rrule = `FREQ=WEEKLY;BYDAY=${days.join(',')}`;
      if (end) rrule += `;UNTIL=${timed ? `${compact(plusDays(end, 1))}T065959Z` : compact(end)}`;
    } else if (end && end > item.start_date) {
      first = item.start_date;
      if (timed) {
        // A camp week with daily hours: weekdays only when it starts and ends on weekdays.
        const weekdaysOnly = !['SA', 'SU'].includes(weekdayOf(item.start_date)) && !['SA', 'SU'].includes(weekdayOf(end));
        rrule = weekdaysOnly ? 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' : 'FREQ=DAILY';
        rrule += `;UNTIL=${compact(plusDays(end, 1))}T065959Z`;
      } else {
        lastDay = end; // one all-day block across the whole range
      }
    } else {
      first = item.start_date;
    }
  }

  const lines = timed
    ? [`DTSTART;TZID=${TZID}:${compact(first)}T${hhmm(startT)}00`, `DTEND;TZID=${TZID}:${compact(first)}T${hhmm(endT)}00`]
    : [`DTSTART;VALUE=DATE:${compact(first)}`, `DTEND;VALUE=DATE:${compact(plusDays(lastDay ?? first, 1))}`];
  if (rrule) lines.push(`RRULE:${rrule}`);
  return lines;
}

/** DTSTART/DTEND for one moment on a day ("registration opens"), all-day when no time. */
export function momentTiming(date: string, time: string | null, minutes = 30): string[] {
  return time
    ? [`DTSTART;TZID=${TZID}:${compact(date)}T${hhmm(time)}00`, `DTEND;TZID=${TZID}:${compact(date)}T${hhmm(addMinutes(time, minutes))}00`]
    : [`DTSTART;VALUE=DATE:${compact(date)}`, `DTEND;VALUE=DATE:${compact(plusDays(date, 1))}`];
}

/** "20261114T183000Z" for DTSTAMP. */
export function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildCalendar(opts: { name: string; events: IcsEvent[]; now?: Date; refreshHours?: number }): string {
  const stamp = utcStamp(opts.now ?? new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Little Sound//Family Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    `X-WR-TIMEZONE:${TZID}`,
  ];
  if (opts.refreshHours) {
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`);
  }
  lines.push(...VTIMEZONE);
  for (const e of opts.events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`, ...e.timing, `SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url.replace(/[\r\n]/g, '')}`);
    if (e.alarmMinutes && e.timing[0].includes('TZID')) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.summary)}`, `TRIGGER:-PT${e.alarmMinutes}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

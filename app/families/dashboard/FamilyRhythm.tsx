'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatTime, type DateItem } from '@/lib/activity-dates';
import { kidColor, kidLabel, overlaps, type Kid } from '@/lib/calendar-grid';
import {
  breathing,
  clashes as findClashes,
  dayWord,
  greeting,
  ideaFor,
  lanes as laneIds,
  radar as buildRadar,
  rhythmEvents,
  sessionShort,
  summaryLine,
  UNASSIGNED,
  watching as findWatching,
  weekDays,
  type Clash,
  type Idea,
  type RhythmActivity,
  type RhythmData,
  type RhythmEvent,
  type RhythmPick,
  type RhythmSession,
} from '@/lib/family-rhythm';
import { plusDays, weekdayOf } from '@/lib/ics';
import { Icon, iconFor, theme } from './rhythm-ui';
import SummerPlanner from './SummerPlanner';
import { summerWeeks } from '@/lib/summer';

// Family Rhythm: the top of the family dashboard. Where things stand, at a
// glance: a one-line read of the week, how full each child's week is,
// clashes (with a fix), the signup radar, and the week by child.
// All the reasoning lives in lib/family-rhythm.ts; this file only draws it.

// ── Look ─────────────────────────────────────────────────────────────────────

function laneName(kids: Kid[], lane: string): string {
  const i = kids.findIndex((k) => k.id === lane);
  return i >= 0 ? kidLabel(kids[i], i) : kids.length ? 'Not assigned' : 'Family';
}

const timeRange = (s: string | null, e: string | null) => (s ? (e ? `${formatTime(s)}–${formatTime(e)}` : formatTime(s)) : 'All day');
const DOW: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
const DAY_FULL: Record<string, string> = { MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday' };
const dow = (iso: string) => DOW[weekdayOf(iso)];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8))}`;

// "Keep both" is remembered per browser (a light convenience; never required).
const DISMISS_KEY = 'ls_rhythm_kept_both';
const VIEW_KEY = 'ls_rhythm_view';
function loadDismissed(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function saveDismissed(keys: string[]) {
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(keys.slice(-50)));
  } catch {
    // private window / storage off: the clash just shows again next visit
  }
}

type Sheet = { kind: 'event'; ev: RhythmEvent } | { kind: 'idea'; idea: Idea; lane: string } | null;

export default function FamilyRhythm({
  firstName,
  hour,
  today,
  activities,
  sessions,
  registrations,
  picks,
  kids,
  reminders,
  busy,
  onAdd,
  onRemove,
  onAssign,
  onSwitch,
  onReminder,
}: {
  firstName: string;
  hour: number;
  today: string;
  activities: RhythmActivity[];
  sessions: Record<string, RhythmSession[]>;
  registrations: Record<string, DateItem[]>;
  picks: RhythmPick[];
  kids: Kid[];
  reminders: string[];
  busy: string | null;
  onAdd: (activityId: string, key: string, kidId: string | null) => void;
  onRemove: (activityId: string, key: string) => void;
  onAssign: (activityId: string, key: string, kidId: string | null) => void;
  onSwitch: (activityId: string, fromKey: string, toKey: string, kidId: string | null) => void;
  onReminder: (activityId: string, date: string, on: boolean) => void;
}) {
  const data: RhythmData = useMemo(() => ({ activities, sessions, registrations, picks, kids }), [activities, sessions, registrations, picks, kids]);
  const [weekOffset, setWeekOffset] = useState(0);
  // "The week ahead" or the Summer planner (remembered per browser).
  const [view, setView] = useState<'week' | 'summer'>('week');
  useEffect(() => {
    try {
      if (window.localStorage.getItem(VIEW_KEY) === 'summer') setView('summer');
    } catch {
      // storage off: start on the week
    }
  }, []);
  function chooseView(v: 'week' | 'summer') {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // fine: it just won't be remembered
    }
  }
  const summerYear = summerWeeks(today).year;
  const [mobileDay, setMobileDay] = useState(today);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => setDismissed(loadDismissed()), []);

  // The week view is the next 7 days starting today (so "now" is always the
  // first column and the summary, breathing room and grid agree); the arrows
  // move it a week at a time.
  const thisWeek = weekDays(today);
  const week = weekDays(plusDays(today, weekOffset * 7));
  const weekEvents = useMemo(() => rhythmEvents(data, week[0], week[6]), [data, week[0]]);
  const nowEvents = useMemo(() => rhythmEvents(data, thisWeek[0], thisWeek[6]), [data, thisWeek[0]]);
  const allClashes = useMemo(() => findClashes(data, today, plusDays(today, 13), today), [data, today]);
  const openClashes = allClashes.filter((c) => !dismissed.includes(c.key));
  // Outline a session only on the days it actually overlaps something
  // (and not for clashes the family chose to keep).
  const clashDay = useMemo(() => {
    const ids = new Set<string>();
    for (const a of weekEvents) {
      for (const b of weekEvents) {
        if (a === b || a.lane !== b.lane || a.date !== b.date || a.key === b.key) continue;
        const key = [a.activityId + '|' + a.key, b.activityId + '|' + b.key].sort().join('~');
        if (!dismissed.includes(key) && overlaps({ id: a.id, start: a.start, end: a.end }, { id: b.id, start: b.start, end: b.end })) ids.add(a.id);
      }
    }
    return ids;
  }, [weekEvents, dismissed]);
  const radarItems = useMemo(() => buildRadar(data, today), [data, today]);
  const watching = useMemo(() => findWatching(data), [data]);
  const rows = laneIds(kids, weekEvents);
  const reminderSet = new Set(reminders);
  const summary = summaryLine(data, today, openClashes.length);

  useEffect(() => {
    if (!week.includes(mobileDay)) setMobileDay(week.includes(today) ? today : week[0]);
  }, [week[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  function keepBoth(c: Clash) {
    const next = [...dismissed, c.key];
    setDismissed(next);
    saveDismissed(next);
  }
  const isBusy = (activityId: string, key: string) => busy === `${activityId}|${key}`;

  return (
    <section aria-label="Family Rhythm">
      {/* Greeting + the week in one line */}
      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#1A7A8A] mb-2">
        Family Rhythm · {DAY_FULL[weekdayOf(today)]}, {md(today)}
      </p>
      <h1 className="font-['Cormorant_Garamond'] font-light text-[34px] sm:text-[44px] leading-[1.05] tracking-tight text-[#1C3A4A] mb-2">
        {greeting(hour)}{firstName ? `, ${firstName}` : ''}<span className="text-[#C4A882]">.</span>
      </h1>
      <p className="font-['Cormorant_Garamond'] italic text-[20px] sm:text-[23px] text-[#3A5A6A] leading-snug max-w-[620px] mb-7">{summary}</p>

      {/* Breathing room */}
      {kids.length > 0 ? (
        <div className={`grid gap-3 mb-6 ${kids.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {kids.map((k, i) => {
            const b = breathing(nowEvents, k.id, thisWeek);
            const t = theme(kids, k.id);
            const tone = b.word === 'Full' ? '#C0544A' : b.word === 'Balanced' ? '#2E7D5B' : '#A8865A';
            return (
              <div key={k.id} className="bg-white rounded-[20px] p-4 sm:p-5 shadow-[0_4px_24px_rgba(10,74,90,0.06)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-['Cormorant_Garamond'] text-[22px] shrink-0" style={{ background: t.color }}>
                  {kidLabel(k, i)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-[15px] text-[#1C3A4A]">
                      {kidLabel(k, i)}
                      {k.age != null && k.name && <span className="text-[#7A9AAA] font-normal text-[13px]"> · {k.age}</span>}
                    </p>
                    <p className="text-[13px] font-semibold" style={{ color: tone }}>{b.word} week</p>
                  </div>
                  <div className="h-2 rounded-full bg-[#F0E9D8] mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${b.pct}%`, background: t.color }} />
                  </div>
                  <p className="text-[12px] text-[#7A9AAA] mt-1.5">
                    {b.hours ? `${b.hours} hr${b.hours === 1 ? '' : 's'} of activities` : 'Nothing added yet'} · {b.freeAfternoons} free after-school afternoon{b.freeAfternoons === 1 ? '' : 's'}
                  </p>
                  {k.name && (
                    <a
                      href={`/discover?for=${encodeURIComponent(k.id)}`}
                      className="mt-3 inline-flex items-center gap-1.5 h-9 rounded-full px-4 text-[13px] font-semibold border-2 transition-colors"
                      style={{ borderColor: t.color, color: t.color }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = t.color; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = t.color; }}
                    >
                      <span aria-hidden="true">+</span> Find activities for {k.name}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-5 mb-6 text-[14px] text-[#3A5A6A] shadow-[0_4px_24px_rgba(10,74,90,0.06)]">
          Add your kids&apos; first names in <a href="#family-profile" className="font-semibold text-[#1A7A8A] underline">your profile</a> to see each child&apos;s week, color-coded.
        </div>
      )}

      {/* Clashes, each with a fix */}
      {openClashes.map((c) => {
        const who = laneName(kids, c.lane);
        const busyFix = c.fix && isBusy(c.fix.move.activityId, c.fix.move.key);
        return (
          <div key={c.key} className="relative overflow-hidden rounded-[22px] bg-[#FFF6E8] border border-[#E8C99A] p-5 sm:p-6 mb-6">
            <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-[#F3D9AE]/40 pointer-events-none" aria-hidden="true" />
            <p className="relative text-[12px] font-bold uppercase tracking-[0.16em] text-[#9A5B1E] mb-1">Heads up · {dayWord(c.date, today)}</p>
            <p className="relative font-['Cormorant_Garamond'] text-[24px] sm:text-[28px] leading-tight text-[#1C3A4A] mb-1">
              {c.lane === UNASSIGNED ? 'Two activities overlap' : `${who} can’t be in two places`} at {c.b.start ? formatTime(c.b.start) : 'once'}.
            </p>
            <p className="relative text-[14px] text-[#5A4A3A] mb-4">
              {c.a.activity.title} runs {timeRange(c.a.start, c.a.end)}; {c.b.activity.title} runs {timeRange(c.b.start, c.b.end)}.
            </p>
            <div className="relative flex flex-wrap gap-2">
              {c.fix && (
                <button
                  type="button"
                  disabled={!!busyFix}
                  onClick={() => onSwitch(c.fix!.move.activityId, c.fix!.move.key, c.fix!.to.key, c.fix!.move.pick.kidId)}
                  className="h-11 px-5 rounded-full bg-[#0D5C6E] text-white text-[14px] font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-60"
                >
                  {busyFix ? 'Switching…' : `Move ${c.fix.move.activity.title} to ${c.fix.label} (same class)`}
                </button>
              )}
              <button type="button" onClick={() => keepBoth(c)} className="h-11 px-5 rounded-full border border-[#D9B98A] text-[#7A5A2E] text-[14px] font-semibold hover:bg-white/60">
                Keep both
              </button>
            </div>
          </div>
        );
      })}

      {/* Signup radar */}
      {(radarItems.length > 0 || watching.length > 0) && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-['Cormorant_Garamond'] text-[26px] font-light text-[#1C3A4A]">Signup radar</h2>
            <p className="text-[12px] text-[#7A9AAA]">From what you’ve saved</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
            {radarItems.map((r, i) => {
              const hero = i === 0 && r.kind === 'opens';
              const remKey = `${r.activity.activityId}|${r.date}`;
              const reminded = reminderSet.has(remKey);
              const ring = Math.min(30, Math.max(r.days, 0));
              const forWho = r.forKids.length ? `For ${r.forKids.map((k) => kidLabel(k, kids.indexOf(k))).join(' & ')}. ` : '';
              const when = `${r.kind === 'opens' ? 'Opens' : 'Closes'} ${dayWord(r.date, today)}${r.time ? ` · ${formatTime(r.time)}` : ''}`;
              return (
                <div
                  key={r.id}
                  className={`snap-start shrink-0 w-[260px] sm:w-[290px] rounded-[22px] p-5 flex flex-col ${hero ? 'bg-[#0D5C6E] text-white' : 'bg-white shadow-[0_4px_24px_rgba(10,74,90,0.06)] text-[#1C3A4A]'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90" aria-hidden="true">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={hero ? 'rgba(255,255,255,0.18)' : '#F0E9D8'} strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={hero ? '#C4A882' : r.kind === 'closes' ? '#C0544A' : '#1A7A8A'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(1 - ring / 30) * 97.4} 97.4`} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="font-['Cormorant_Garamond'] text-[22px]">{r.days}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-70">{r.days === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-semibold ${hero ? 'text-[#C4A882]' : r.kind === 'closes' ? 'text-[#C0544A]' : 'text-[#1A7A8A]'}`}>{when}</p>
                      <p className="font-semibold text-[15px] leading-snug">{r.activity.title}</p>
                    </div>
                  </div>
                  <p className={`text-[13px] mb-4 flex-1 ${hero ? 'text-white/80' : 'text-[#5A7A8A]'}`}>
                    {forWho}
                    {r.kind === 'opens' ? (reminded ? 'We’ll email you the day before and the morning it opens.' : 'Popular programs can fill quickly.') : 'Registration is open now.'}
                  </p>
                  <div className="flex items-center gap-3">
                    {r.kind === 'opens' && (
                      <button
                        type="button"
                        onClick={() => onReminder(r.activity.activityId, r.date, !reminded)}
                        disabled={busy === `reminder|${remKey}`}
                        className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors disabled:opacity-60 ${
                          reminded
                            ? hero ? 'bg-[#C4A882] text-[#1C3A4A]' : 'bg-[#0D5C6E] text-white'
                            : hero ? 'border border-white/40 text-white hover:bg-white/10' : 'border border-[#C5D8E8] text-[#0D5C6E] hover:bg-[#C5D8E8]/20'
                        }`}
                      >
                        {reminded ? '✓ Reminder set' : 'Remind me'}
                      </button>
                    )}
                    {r.activity.website && (
                      <a href={r.activity.website} target="_blank" rel="noopener noreferrer" className={`text-[13px] font-semibold whitespace-nowrap ${hero ? 'text-white' : 'text-[#1A7A8A]'}`}>
                        Sign-up page →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {watching.length > 0 && (
              <div className="snap-start shrink-0 w-[240px] rounded-[22px] p-5 border-2 border-dashed border-[#E3DAC5] flex flex-col justify-center">
                <p className="font-['Cormorant_Garamond'] text-[32px] leading-none text-[#A8865A] [font-variant-numeric:lining-nums]">{watching.length}</p>
                <p className="text-[14px] font-semibold text-[#1C3A4A] mt-1">saved {watching.length === 1 ? 'activity' : 'activities'} we’re watching</p>
                <p className="text-[12px] text-[#7A9AAA] mt-1">We check their sites daily and add signup dates here as soon as they’re posted.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The week, by child, or the summer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex bg-white rounded-full p-1 shadow-[0_2px_12px_rgba(10,74,90,0.06)]" role="tablist" aria-label="Plan view">
          {(['week', 'summer'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => chooseView(v)}
              className={`h-9 px-4 sm:px-5 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap ${view === v ? 'bg-[#0D5C6E] text-white' : 'text-[#3A5A6A] hover:text-[#0D5C6E]'}`}
            >
              {v === 'week' ? (weekOffset === 0 ? 'The week ahead' : weekOffset === 1 ? 'The week after' : `${md(week[0])} – ${md(week[6])}`) : `Summer ${summerYear}`}
            </button>
          ))}
        </div>
        {view === 'week' && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week" className="w-9 h-9 rounded-full hover:bg-white text-[#0D5C6E] text-lg">‹</button>
            {weekOffset !== 0 && (
              <button type="button" onClick={() => setWeekOffset(0)} className="h-9 px-3 rounded-full border border-[#C5D8E8] text-[13px] font-semibold text-[#0D5C6E] hover:bg-white">Today</button>
            )}
            <button type="button" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week" className="w-9 h-9 rounded-full hover:bg-white text-[#0D5C6E] text-lg">›</button>
          </div>
        )}
      </div>

      {view === 'summer' ? (
        <SummerPlanner kids={kids} reminders={reminders} onReminder={onReminder} />
      ) : (
      <>
      {/* Lanes: tablet / desktop */}
      <div className="hidden md:block bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.08)] overflow-hidden">
        <div className="grid grid-cols-[128px_repeat(7,1fr)] border-b border-[#EFE7D4]">
          <div />
          {week.map((d, i) => (
            <div key={d} className={`py-3 text-center ${d === today ? 'bg-[#F5EFE0]' : ''}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A9AAA]">{d === today ? 'Today' : dow(d)}</p>
              <p className={`font-['Cormorant_Garamond'] text-[22px] leading-none mt-0.5 ${d === today ? 'text-[#0D5C6E] font-medium' : d < today ? 'text-[#B5C4CC]' : 'text-[#1C3A4A]'}`}>{Number(d.slice(8))}</p>
            </div>
          ))}
        </div>
        {/* Signups lane (only when a signup date is in view) */}
        {radarItems.some((r) => week.includes(r.date)) && (
        <div className="grid grid-cols-[128px_repeat(7,1fr)] border-b border-[#EFE7D4] min-h-[52px]">
          <div className="flex items-center gap-2 px-4"><span className="text-[#C4A882]">◆</span><span className="text-[13px] font-semibold text-[#7A5A2E]">Signups</span></div>
          {week.map((d) => (
            <div key={d} className={`p-1.5 flex flex-col gap-1 ${d === today ? 'bg-[#F5EFE0]/60' : ''}`}>
              {radarItems.filter((r) => r.date === d).map((r) => (
                <div key={r.id} className="rounded-xl bg-[#C4A882]/20 text-[#7A5A2E] text-[11.5px] font-semibold px-2 py-1.5 leading-tight">
                  {r.time ? `${formatTime(r.time)} · ` : ''}{r.activity.title} {r.kind === 'opens' ? 'opens' : 'closes'}
                </div>
              ))}
            </div>
          ))}
        </div>
        )}
        {rows.map((lane) => {
          const t = theme(kids, lane);
          return (
            <div key={lane} className="grid grid-cols-[128px_repeat(7,1fr)] border-b last:border-b-0 border-[#EFE7D4] min-h-[120px]">
              <div className="flex items-center gap-2.5 px-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-['Cormorant_Garamond'] text-[16px] shrink-0" style={{ background: t.color }}>
                  {laneName(kids, lane)[0]}
                </div>
                <span className="text-[13px] font-semibold text-[#1C3A4A] leading-tight min-w-0 break-words">{laneName(kids, lane)}</span>
              </div>
              {week.map((d) => {
                const list = weekEvents.filter((e) => e.lane === lane && e.date === d);
                const idea = d >= today && !list.length ? ideaFor(data, lane, d, weekEvents) : null;
                return (
                  <div key={d} className={`p-1.5 flex flex-col gap-1.5 ${d === today ? 'bg-[#F5EFE0]/60' : ''} ${d < today ? 'opacity-50' : ''}`}>
                    {list.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSheet({ kind: 'event', ev: e })}
                        className={`text-left rounded-[14px] px-2.5 py-2 transition-transform hover:-translate-y-0.5 ${clashDay.has(e.id) ? 'ring-2 ring-[#E0A458] ring-offset-1' : ''}`}
                        style={{ background: t.soft, color: t.ink }}
                      >
                        <p className="text-[11px] font-semibold opacity-80">{e.start ? formatTime(e.start) : 'All day'}</p>
                        <p className="text-[12.5px] font-semibold leading-tight flex items-start gap-1">
                          <Icon name={iconFor(e.activity.category)} size={13} />
                          <span className="line-clamp-2">{e.activity.title}</span>
                        </p>
                        {e.activity.neighborhood && <p className="text-[11px] opacity-70 truncate">{e.activity.neighborhood}</p>}
                      </button>
                    ))}
                    {idea && (
                      <button
                        type="button"
                        onClick={() => setSheet({ kind: 'idea', idea, lane })}
                        className="group text-left rounded-[14px] px-2.5 py-2 border border-dashed border-[#C5D8E8] hover:border-[#1A7A8A] hover:bg-[#F7FBFC] transition-colors"
                      >
                        <p className="text-[11px] font-semibold text-[#7A9AAA]">Open · idea</p>
                        <p className="text-[12px] font-semibold text-[#3A5A6A] leading-tight line-clamp-2">{idea.activity.title}</p>
                        <p className="text-[11px] text-[#7A9AAA]">{idea.start ? formatTime(idea.start) : 'All day'}</p>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Phone: day strip + each child's day */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1 mb-4">
          {week.map((d, i) => {
            const lanesOn = rows.filter((l) => weekEvents.some((e) => e.lane === l && e.date === d));
            const sel = d === mobileDay;
            const signup = radarItems.some((r) => r.date === d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setMobileDay(d)}
                aria-pressed={sel}
                aria-label={`${dow(d)} ${md(d)}`}
                className={`rounded-[16px] py-2 flex flex-col items-center ${sel ? 'bg-[#0D5C6E] text-white' : 'bg-white text-[#1C3A4A]'} ${d < today && !sel ? 'opacity-50' : ''}`}
              >
                <span className={`text-[10px] font-semibold uppercase ${sel ? 'text-white/70' : 'text-[#7A9AAA]'}`}>{dow(d)}</span>
                <span className="font-['Cormorant_Garamond'] text-[20px] leading-tight">{Number(d.slice(8))}</span>
                <span className="flex gap-0.5 h-1.5 mt-0.5">
                  {lanesOn.map((l) => <span key={l} className="w-1.5 h-1.5 rounded-full" style={{ background: sel ? '#fff' : theme(kids, l).color }} />)}
                  {signup && <span className="w-1.5 h-1.5 rotate-45" style={{ background: '#C4A882' }} />}
                </span>
              </button>
            );
          })}
        </div>
        {radarItems.filter((r) => r.date === mobileDay).map((r) => (
          <div key={r.id} className="rounded-[16px] bg-[#C4A882]/20 text-[#7A5A2E] text-[14px] font-semibold px-4 py-3 mb-3">
            ◆ {r.time ? `${formatTime(r.time)} · ` : ''}{r.activity.title} registration {r.kind === 'opens' ? 'opens' : 'closes'}
          </div>
        ))}
        {rows.map((lane) => {
          const t = theme(kids, lane);
          const list = weekEvents.filter((e) => e.lane === lane && e.date === mobileDay);
          const idea = mobileDay >= today && !list.length ? ideaFor(data, lane, mobileDay, weekEvents) : null;
          return (
            <div key={lane} className="bg-white rounded-[20px] p-4 mb-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-['Cormorant_Garamond'] text-[15px]" style={{ background: t.color }}>{laneName(kids, lane)[0]}</div>
                <span className="text-[14px] font-semibold text-[#1C3A4A]">{laneName(kids, lane)}</span>
              </div>
              {list.length ? (
                list.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSheet({ kind: 'event', ev: e })}
                    className={`w-full text-left rounded-[14px] px-3 py-2.5 mb-1.5 ${clashDay.has(e.id) ? 'ring-2 ring-[#E0A458]' : ''}`}
                    style={{ background: t.soft, color: t.ink }}
                  >
                    <span className="text-[12px] font-semibold opacity-80">{timeRange(e.start, e.end)}</span>
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold"><Icon name={iconFor(e.activity.category)} />{e.activity.title}</span>
                    <span className="block text-[12px] opacity-70">{[e.activity.provider, e.activity.neighborhood].filter(Boolean).join(' · ')}</span>
                  </button>
                ))
              ) : idea ? (
                <button type="button" onClick={() => setSheet({ kind: 'idea', idea, lane })} className="w-full text-left rounded-[14px] px-3 py-2.5 border border-dashed border-[#C5D8E8]">
                  <span className="text-[12px] font-semibold text-[#7A9AAA]">Free · an idea from your saved list</span>
                  <span className="block text-[15px] font-semibold text-[#3A5A6A]">{idea.activity.title} · {idea.start ? formatTime(idea.start) : 'all day'}</span>
                  <span className="block text-[13px] font-semibold text-[#1A7A8A] mt-1">+ Add for {laneName(kids, lane)}</span>
                </button>
              ) : (
                <p className="italic font-['Cormorant_Garamond'] text-[17px] text-[#7A9AAA]">{mobileDay < today ? 'Nothing that day.' : 'Free day. Enjoy it.'}</p>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Details sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Details">
          <div className="absolute inset-0 bg-[#1C3A4A]/35" onClick={() => setSheet(null)} />
          <div className="relative bg-white w-full sm:max-w-[480px] rounded-t-[28px] sm:rounded-[28px] p-6 pb-8 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 rounded-full bg-[#E3DAC5] mx-auto -mt-2 mb-4" />
            <button type="button" onClick={() => setSheet(null)} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full hover:bg-[#F5EFE0] text-[#7A9AAA] text-[20px]">×</button>
            {sheet.kind === 'event' ? (
              <EventDetails
                ev={sheet.ev}
                kids={kids}
                today={today}
                sessions={sessions[sheet.ev.activityId] ?? []}
                picks={picks}
                clash={openClashes.find((c) => [c.a, c.b].some((x) => x.activityId === sheet.ev.activityId && x.key === sheet.ev.key)) ?? null}
                busy={isBusy(sheet.ev.activityId, sheet.ev.key)}
                onAssign={(kid) => onAssign(sheet.ev.activityId, sheet.ev.key, kid)}
                onRemove={() => { onRemove(sheet.ev.activityId, sheet.ev.key); setSheet(null); }}
                onSwitch={(toKey) => { onSwitch(sheet.ev.activityId, sheet.ev.key, toKey, sheet.ev.pick.kidId); setSheet(null); }}
              />
            ) : (
              <IdeaDetails
                idea={sheet.idea}
                lane={sheet.lane}
                kids={kids}
                today={today}
                busy={isBusy(sheet.idea.activity.activityId, sheet.idea.session.key)}
                onAdd={(kid) => { onAdd(sheet.idea.activity.activityId, sheet.idea.session.key, kid); setSheet(null); }}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function EventDetails({
  ev, kids, today, sessions, picks, clash, busy, onAssign, onRemove, onSwitch,
}: {
  ev: RhythmEvent; kids: Kid[]; today: string; sessions: RhythmSession[]; picks: RhythmPick[]; clash: Clash | null; busy: boolean;
  onAssign: (kid: string | null) => void; onRemove: () => void; onSwitch: (toKey: string) => void;
}) {
  const t = theme(kids, ev.lane);
  const current = picks.find((p) => p.activityId === ev.activityId && p.key === ev.key);
  const taken = new Set(picks.filter((p) => p.activityId === ev.activityId && p.status !== 'gone').map((p) => p.key));
  const others = sessions.filter((s) => !taken.has(s.key)).slice(0, 4);
  return (
    <>
      <div className="flex items-center gap-3 mb-3 pr-8">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: t.soft, color: t.ink }}>
          <Icon name={iconFor(ev.activity.category)} size={22} />
        </div>
        <div>
          <p className="text-[12px] font-semibold" style={{ color: t.color }}>
            {laneName(kids, ev.lane)} · {dayWord(ev.date, today)} · {timeRange(ev.start, ev.end)}
          </p>
          <p className="font-['Cormorant_Garamond'] text-[25px] leading-tight text-[#1C3A4A]">{ev.activity.title}</p>
        </div>
      </div>
      <p className="text-[14px] text-[#3A5A6A] mb-1">{ev.session.item.label ? `${ev.session.item.label} · ` : ''}{ev.session.text.replace(/^.*?: /, '')}</p>
      <p className="text-[13px] text-[#7A9AAA] mb-4">{[ev.activity.provider, ev.session.item.location ?? ev.activity.neighborhood].filter(Boolean).join(' · ')}</p>
      {current?.status === 'changed' && current.changeNote && (
        <p className="text-[13px] text-[#7A5A2E] bg-[#C4A882]/15 rounded-lg px-3 py-2 mb-4">Updated by the provider · {current.changeNote}</p>
      )}
      {clash && (
        <p className="text-[13px] text-[#9A5B1E] bg-[#FFF6E8] border border-[#E8C99A] rounded-lg px-3 py-2 mb-4">
          Overlaps with {(clash.a.activityId === ev.activityId && clash.a.key === ev.key ? clash.b : clash.a).activity.title}.
        </p>
      )}
      {kids.length > 0 && (
        <label className="flex items-center gap-2 text-[13px] text-[#5A7A8A] mb-4">
          This is for
          <select
            value={current?.kidId ?? ''}
            disabled={busy}
            onChange={(e) => onAssign(e.target.value || null)}
            className="h-9 rounded-full border border-[#C5D8E8] px-3 text-[13px] text-[#1C3A4A] bg-white"
          >
            <option value="">Not assigned</option>
            {kids.map((k, i) => <option key={k.id} value={k.id}>{kidLabel(k, i)}</option>)}
          </select>
        </label>
      )}
      {others.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#7A9AAA] mb-1.5">Same class, other times</p>
          <div className="flex flex-wrap gap-2">
            {others.map((s) => (
              <button key={s.key} type="button" disabled={busy} onClick={() => onSwitch(s.key)} className="h-9 px-3.5 rounded-full border border-[#C5D8E8] text-[#0D5C6E] text-[13px] font-semibold hover:bg-[#C5D8E8]/20 disabled:opacity-50">
                Switch to {sessionShort(s.item, today)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#EFE7D4]">
        {ev.activity.website && (
          <a href={ev.activity.website} target="_blank" rel="noopener noreferrer" className="h-10 px-4 inline-flex items-center rounded-full border border-[#C5D8E8] text-[#0D5C6E] text-[13px] font-semibold">Their site →</a>
        )}
        <button type="button" disabled={busy} onClick={onRemove} className="h-10 px-4 rounded-full text-[#C0544A] text-[13px] font-semibold hover:bg-[#C0544A]/5 disabled:opacity-50">Remove from calendar</button>
      </div>
    </>
  );
}

function IdeaDetails({ idea, lane, kids, today, busy, onAdd }: { idea: Idea; lane: string; kids: Kid[]; today: string; busy: boolean; onAdd: (kid: string | null) => void }) {
  const t = theme(kids, lane);
  const name = laneName(kids, lane);
  return (
    <>
      <p className="text-[12px] font-semibold mb-1" style={{ color: t.color }}>An idea for {name} · {dayWord(idea.date, today)}</p>
      <p className="font-['Cormorant_Garamond'] text-[26px] leading-tight text-[#1C3A4A] mb-1 pr-8">{idea.activity.title}</p>
      <p className="text-[14px] text-[#3A5A6A] mb-1">{idea.session.text}</p>
      <p className="text-[13px] text-[#7A9AAA] mb-4">{[idea.activity.provider, idea.activity.neighborhood].filter(Boolean).join(' · ')} · from your saved activities</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => onAdd(lane === UNASSIGNED ? null : lane)} className="h-11 px-5 rounded-full bg-[#0D5C6E] text-white text-[14px] font-semibold hover:bg-[#1A7A8A] disabled:opacity-60">
          Add for {name}
        </button>
        {idea.activity.website && (
          <a href={idea.activity.website} target="_blank" rel="noopener noreferrer" className="h-11 px-5 inline-flex items-center rounded-full border border-[#C5D8E8] text-[#0D5C6E] text-[14px] font-semibold">Their site →</a>
        )}
      </div>
      <p className="text-[12px] text-[#7A9AAA] mt-3">It goes on {name}’s calendar every time this session meets. You can remove it anytime.</p>
    </>
  );
}

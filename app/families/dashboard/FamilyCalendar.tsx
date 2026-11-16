'use client';

import { useMemo, useState } from 'react';
import { formatTime, type DateItem } from '@/lib/activity-dates';
import {
  clashMap,
  dayLabel,
  kidColor,
  kidLabel,
  monthGrid,
  monthLabel,
  occurrences,
  overlaps,
  shiftMonth,
  type Kid,
} from '@/lib/calendar-grid';
import type { CalendarActivity } from '@/lib/family-calendar';
import type { CalendarPick, CalendarSession } from './CalendarParts';

// The family's month calendar, at the top of the dashboard.
//   ● sessions they added (colored by child)
//   ○ other dates of activities they saved (lighter; tap a day to add one)
//   ◆ registration opening / closing
// Tap a day to see its details underneath: times, which child, overlaps,
// add/remove, and a link to the provider.

type Kind = 'picked' | 'other' | 'reg-open' | 'reg-close';
interface CalEvent {
  id: string;
  kind: Kind;
  date: string;
  start: string | null;
  end: string | null;
  activity: CalendarActivity;
  session?: CalendarSession;
  pick?: CalendarPick;
  reg?: DateItem;
}

const REG_COLOR = '#A8865A';
const KIND_ORDER: Record<Kind, number> = { 'reg-open': 0, 'reg-close': 1, picked: 2, other: 3 };
const pickId = (activityId: string, key: string) => `${activityId}|${key}`;

function timeText(e: CalEvent): string {
  if (!e.start) return e.kind.startsWith('reg') ? 'Any time' : 'All day';
  if (e.kind.startsWith('reg')) return formatTime(e.start);
  return e.end ? `${formatTime(e.start)}–${formatTime(e.end)}` : formatTime(e.start);
}

export default function FamilyCalendar({
  activities,
  sessions,
  registrations,
  picks,
  kids,
  today,
  busy,
  onAdd,
  onRemove,
  onAssign,
}: {
  activities: CalendarActivity[];
  sessions: Record<string, CalendarSession[]>;
  registrations: Record<string, DateItem[]>;
  picks: CalendarPick[];
  kids: Kid[];
  today: string;
  busy: string | null;
  onAdd: (activityId: string, key: string, kidId: string | null) => void;
  onRemove: (activityId: string, key: string) => void;
  onAssign: (activityId: string, key: string, kidId: string | null) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [showOthers, setShowOthers] = useState(true);
  const [addFor, setAddFor] = useState<Record<string, string>>({}); // which child an "Add" is for

  const grid = useMemo(() => monthGrid(month), [month]);

  const byDay = useMemo(() => {
    const picked = new Map(picks.filter((p) => p.status !== 'gone').map((p) => [pickId(p.activityId, p.key), p]));
    const map = new Map<string, CalEvent[]>();
    const add = (e: CalEvent) => map.set(e.date, [...(map.get(e.date) ?? []), e]);
    for (const a of activities) {
      for (const s of sessions[a.activityId] ?? []) {
        const pick = picked.get(pickId(a.activityId, s.key));
        if (!pick && !showOthers) continue;
        for (const o of occurrences(s.item, grid.from, grid.to, pick ? pick.anchor : today)) {
          add({ id: `${a.activityId}|${s.key}|${o.date}`, kind: pick ? 'picked' : 'other', date: o.date, start: o.start, end: o.end, activity: a, session: s, pick });
        }
      }
      for (const r of registrations[a.activityId] ?? []) {
        if (r.start_date && r.start_date >= grid.from && r.start_date <= grid.to) {
          add({ id: `${a.activityId}|ro|${r.start_date}|${r.start_time ?? ''}`, kind: 'reg-open', date: r.start_date, start: r.start_time, end: null, activity: a, reg: r });
        }
        if (r.end_date && r.end_date >= grid.from && r.end_date <= grid.to) {
          add({ id: `${a.activityId}|rc|${r.end_date}|${r.end_time ?? ''}`, kind: 'reg-close', date: r.end_date, start: r.end_time, end: null, activity: a, reg: r });
        }
      }
    }
    map.forEach((list) => list.sort((x, y) => KIND_ORDER[x.kind] - KIND_ORDER[y.kind] || (x.start ?? '').localeCompare(y.start ?? '')));
    return map;
  }, [activities, sessions, registrations, picks, showOthers, grid, today]);

  const clashDays = useMemo(() => {
    const set = new Set<string>();
    byDay.forEach((list, day) => {
      if (clashMap(list.filter((e) => e.kind === 'picked')).size) set.add(day);
    });
    return set;
  }, [byDay]);

  const dayEvents = byDay.get(selected) ?? [];
  const pickedToday = dayEvents.filter((e) => e.kind === 'picked');
  const clashes = clashMap(pickedToday);
  const hasAnyDates = activities.some((a) => (sessions[a.activityId] ?? []).length || (registrations[a.activityId] ?? []).length);

  const color = (e: CalEvent) =>
    e.kind === 'picked' ? kidColor(kids, e.pick?.kidId) : e.kind === 'other' ? '#9FB8C4' : REG_COLOR;
  const short = (e: CalEvent) =>
    e.kind === 'reg-open' ? `◆ Reg opens: ${e.activity.title}` : e.kind === 'reg-close' ? `◆ Reg closes: ${e.activity.title}` : `${e.start ? formatTime(e.start) + ' ' : ''}${e.activity.title}`;

  function goTo(m: string) {
    setMonth(m);
    setSelected(m === today.slice(0, 7) ? today : `${m}-01`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-['Cormorant_Garamond'] text-[22px] sm:text-[26px] font-light text-[#1C3A4A] leading-none whitespace-nowrap">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goTo(shiftMonth(month, -1))} aria-label="Previous month" className="w-9 h-9 rounded-full hover:bg-[#F5EFE0] text-[#0D5C6E] text-lg">‹</button>
          <button type="button" onClick={() => goTo(today.slice(0, 7))} className="h-9 px-3 rounded-full border border-[#C5D8E8] text-[13px] font-semibold text-[#0D5C6E] hover:bg-[#C5D8E8]/20">Today</button>
          <button type="button" onClick={() => goTo(shiftMonth(month, 1))} aria-label="Next month" className="w-9 h-9 rounded-full hover:bg-[#F5EFE0] text-[#0D5C6E] text-lg">›</button>
        </div>
      </div>

      {/* Month grid */}
      <div role="grid" aria-label={`${monthLabel(month)} calendar`} className="border border-[#E8DFC8] rounded-[16px] overflow-hidden">
        <div role="row" className="grid grid-cols-7 bg-[#F5EFE0] text-[11px] font-semibold uppercase tracking-wider text-[#7A9AAA]">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} role="columnheader" className="py-2 text-center">
              <span className="sm:hidden">{d[0]}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        {grid.weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7 border-t border-[#E8DFC8]">
            {week.map((day) => {
              const list = byDay.get(day) ?? [];
              const inMonth = day.slice(0, 7) === month;
              const isToday = day === today;
              const isSel = day === selected;
              const past = day < today;
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={`${dayLabel(day)}: ${list.length ? `${list.length} item${list.length === 1 ? '' : 's'}` : 'nothing'}${clashDays.has(day) ? ', has an overlap' : ''}`}
                  onClick={() => setSelected(day)}
                  className={`relative flex flex-col items-stretch justify-start text-left min-h-[54px] sm:min-h-[84px] p-1 sm:p-1.5 border-l first:border-l-0 border-[#E8DFC8] transition-colors ${
                    isSel ? 'bg-[#C5D8E8]/35' : 'hover:bg-[#F5EFE0]/70'
                  } ${inMonth ? '' : 'bg-[#FAF7F0]'} ${past && !isSel ? 'opacity-55' : ''}`}
                >
                  <span
                    className={`self-start inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] ${
                      isToday ? 'bg-[#0D5C6E] text-white font-semibold' : inMonth ? 'text-[#1C3A4A]' : 'text-[#B5C4CC]'
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {clashDays.has(day) && (
                    <span className="absolute top-1 right-1 text-[11px]" aria-hidden="true" title="Overlapping sessions">⚠️</span>
                  )}
                  {/* Phones: dots */}
                  <span className="sm:hidden flex flex-wrap gap-0.5 mt-0.5 px-0.5">
                    {list.slice(0, 4).map((e) => (
                      <span
                        key={e.id}
                        className="w-1.5 h-1.5 rounded-full"
                        style={e.kind === 'other' ? { border: `1px solid ${color(e)}` } : { background: color(e) }}
                      />
                    ))}
                  </span>
                  {/* Larger screens: chips */}
                  <span className="hidden sm:flex flex-col gap-0.5 mt-0.5">
                    {list.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        className="block truncate rounded-[5px] px-1 py-px text-[10.5px] leading-tight font-medium"
                        style={
                          e.kind === 'picked'
                            ? { background: color(e), color: '#fff' }
                            : e.kind === 'other'
                            ? { border: `1px dashed ${color(e)}`, color: '#5A7A8A' }
                            : { background: '#C4A882' + '33', color: '#7A5A2E' }
                        }
                      >
                        {short(e)}
                      </span>
                    ))}
                    {list.length > 2 && <span className="text-[10.5px] text-[#7A9AAA] px-1">+{list.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend + toggle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[12px] text-[#5A7A8A]">
        {kids.map((k, i) => (
          <span key={k.id} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: kidColor(kids, k.id) }} />
            {kidLabel(k, i)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: kidColor(kids, null) }} />
          {kids.length ? 'Not assigned' : 'Added'}
        </span>
        <span className="inline-flex items-center gap-1.5"><span style={{ color: REG_COLOR }}>◆</span> Registration</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none ml-auto">
          <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} className="accent-[#0D5C6E]" />
          Show other dates of saved activities
        </label>
      </div>

      {/* Selected day */}
      <div className="mt-5" aria-live="polite">
        <h3 className="text-[15px] font-semibold text-[#1C3A4A] mb-2">
          {dayLabel(selected)}
          {selected === today && <span className="ml-2 text-[12px] font-medium text-[#1A7A8A]">Today</span>}
        </h3>
        {!activities.length ? (
          <p className="text-[14px] text-[#5A7A8A]">
            Save activities on <a href="/discover" className="text-[#1A7A8A] font-semibold underline">Discover</a> and their dates and registration deadlines will show up here.
          </p>
        ) : !hasAnyDates ? (
          <p className="text-[14px] text-[#5A7A8A]">
            The activities you&apos;ve saved don&apos;t have dates posted yet. We check providers&apos; sites every day and will add them here as soon as they&apos;re out.
          </p>
        ) : !dayEvents.length ? (
          <p className="text-[14px] text-[#7A9AAA]">Nothing on this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayEvents.map((e) => {
              const busyThis = busy === pickId(e.activity.activityId, e.session?.key ?? '');
              const clashWith = (e.kind === 'picked' ? (clashes.get(e.id) ?? []).map((id) => pickedToday.find((p) => p.id === id)) : pickedToday.filter((p) => overlaps(p, e))).filter(Boolean) as CalEvent[];
              const label = e.session?.item.label && !e.activity.title.toLowerCase().includes(e.session.item.label.toLowerCase()) ? e.session.item.label : null;
              const where = [e.activity.provider, e.session?.item.location ?? e.activity.neighborhood].filter(Boolean).join(' · ');
              const kidKey = `${e.activity.activityId}|${e.session?.key}`;
              return (
                <li key={e.id} className="flex gap-3 border border-[#E8DFC8] rounded-[14px] p-3 bg-white">
                  <span className="w-1 rounded-full shrink-0" style={{ background: color(e) }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: e.kind.startsWith('reg') ? '#7A5A2E' : '#5A7A8A' }}>
                      {e.kind === 'reg-open' ? `Registration opens · ${timeText(e)}` : e.kind === 'reg-close' ? `Registration closes · ${timeText(e)}` : timeText(e)}
                      {e.kind === 'other' && <span className="font-normal text-[#7A9AAA]"> · not in your calendar</span>}
                    </p>
                    <p className="text-[15px] font-semibold text-[#1C3A4A] leading-snug">
                      {e.activity.title}
                      {label && <span className="font-normal text-[#3A5A6A]"> · {label}</span>}
                    </p>
                    {where && <p className="text-[12px] text-[#7A9AAA]">{where}</p>}
                    {e.pick?.status === 'changed' && e.pick.changeNote && (
                      <p className="text-[12px] text-[#7A5A2E] mt-1">Updated by the provider · {e.pick.changeNote}</p>
                    )}
                    {clashWith.length > 0 && (
                      <p className="text-[12px] text-[#9A5B1E] bg-[#C4A882]/15 rounded-md px-2 py-1 mt-1.5 inline-block">
                        ⚠️ {e.kind === 'picked' ? 'Overlaps with' : 'Would overlap with'} {clashWith.map((c) => `${c.activity.title} (${timeText(c)})`).join(', ')}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {e.kind === 'picked' && e.session && (
                        <>
                          {kids.length > 0 && (
                            <label className="inline-flex items-center gap-1.5 text-[12px] text-[#5A7A8A]">
                              For
                              <select
                                value={e.pick?.kidId ?? ''}
                                disabled={busyThis}
                                onChange={(ev) => onAssign(e.activity.activityId, e.session!.key, ev.target.value || null)}
                                className="h-8 rounded-full border border-[#C5D8E8] px-2.5 text-[12px] text-[#1C3A4A] bg-white"
                              >
                                <option value="">Not assigned</option>
                                {kids.map((k, i) => <option key={k.id} value={k.id}>{kidLabel(k, i)}</option>)}
                              </select>
                            </label>
                          )}
                          <button
                            type="button"
                            disabled={busyThis}
                            onClick={() => onRemove(e.activity.activityId, e.session!.key)}
                            className="h-8 px-3 rounded-full text-[12px] font-semibold text-[#C0544A] border border-[#C0544A]/30 hover:bg-[#C0544A]/5 disabled:opacity-50"
                          >
                            {busyThis ? '…' : 'Remove from calendar'}
                          </button>
                        </>
                      )}
                      {e.kind === 'other' && e.session && (
                        <>
                          {kids.length > 0 && (
                            <label className="inline-flex items-center gap-1.5 text-[12px] text-[#5A7A8A]">
                              For
                              <select
                                value={addFor[kidKey] ?? (kids.length === 1 ? kids[0].id : '')}
                                onChange={(ev) => setAddFor((m) => ({ ...m, [kidKey]: ev.target.value }))}
                                className="h-8 rounded-full border border-[#C5D8E8] px-2.5 text-[12px] text-[#1C3A4A] bg-white"
                              >
                                <option value="">Not assigned</option>
                                {kids.map((k, i) => <option key={k.id} value={k.id}>{kidLabel(k, i)}</option>)}
                              </select>
                            </label>
                          )}
                          <button
                            type="button"
                            disabled={busyThis}
                            onClick={() => onAdd(e.activity.activityId, e.session!.key, (addFor[kidKey] ?? (kids.length === 1 ? kids[0].id : '')) || null)}
                            className="h-8 px-3.5 rounded-full text-[12px] font-semibold bg-[#0D5C6E] text-white hover:bg-[#1A7A8A] disabled:opacity-50"
                          >
                            {busyThis ? '…' : 'Add to my calendar'}
                          </button>
                        </>
                      )}
                      {e.activity.website && (
                        <a href={e.activity.website} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#1A7A8A] hover:text-[#0D5C6E]">
                          {e.kind.startsWith('reg') ? 'Register on their site →' : 'Their site →'}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

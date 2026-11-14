'use client';

import { useState } from 'react';
import type { DateItem } from '@/lib/activity-dates';
import { buildCalendar } from '@/lib/ics';
import { sessionEvent } from '@/lib/family-calendar';

export interface CalendarSession {
  key: string;
  text: string;
  item: DateItem;
}
export interface CalendarPick {
  activityId: string;
  key: string;
  status: 'active' | 'changed' | 'gone';
  changeNote: string | null;
  text: string;
}

// ── "Your calendar" panel: subscribe links + email alerts switch ─────────────

export function CalendarPanel({ feedUrl, emailAlerts }: { feedUrl: string; emailAlerts: boolean }) {
  const [url, setUrl] = useState(feedUrl);
  const [alerts, setAlerts] = useState(emailAlerts);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const webcal = url.replace(/^https:/, 'webcal:');
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const outlook = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent('Little Sound')}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg('Copy didn’t work here. Press and hold the link below to copy it.');
    }
  }

  async function reset() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/families/calendar/reset', { method: 'POST' });
      const r = await res.json().catch(() => ({}));
      if (!res.ok || !r.url) throw new Error(r.error || 'Could not reset the link.');
      setUrl(r.url);
      setConfirmReset(false);
      setMsg('New link made. The old one has stopped working, so subscribe again with the buttons above.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not reset the link.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAlerts(next: boolean) {
    setAlerts(next);
    setMsg('');
    const res = await fetch('/api/families/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setAlerts(!next);
      setMsg('Couldn’t save that. Please try again.');
    }
  }

  const pill =
    'inline-flex items-center justify-center h-10 rounded-full px-4 text-[13px] font-semibold border border-[#C5D8E8] text-[#0D5C6E] bg-white hover:bg-[#C5D8E8]/20 transition-colors';

  return (
    <div className="bg-[#F5EFE0] rounded-[18px] p-5 mb-5">
      <h3 className="font-['Cormorant_Garamond'] text-[22px] font-light text-[#1C3A4A] leading-tight mb-1">
        Your Little Sound calendar
      </h3>
      <p className="text-[14px] text-[#3A5A6A] mb-4">
        Sessions you add below, plus registration dates for everything you&apos;ve saved, show up in your own calendar
        and stay up to date when providers change their schedules.
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        <a href={google} target="_blank" rel="noopener noreferrer" className={pill}>Google Calendar</a>
        <a href={webcal} className={pill}>Apple / iPhone</a>
        <a href={outlook} target="_blank" rel="noopener noreferrer" className={pill}>Outlook</a>
        <button type="button" onClick={copy} className={pill}>{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <p className="text-[12px] text-[#7A9AAA] mb-4">
        Calendar apps check for changes on their own schedule; Google can take up to a day. This link is private to
        your family.{' '}
        {confirmReset ? (
          <span>
            Make a new link? The old one stops working.{' '}
            <button type="button" onClick={reset} disabled={busy} className="font-semibold text-[#C0544A] underline disabled:opacity-50">
              {busy ? 'Resetting…' : 'Yes, reset'}
            </button>{' '}
            <button type="button" onClick={() => setConfirmReset(false)} className="underline">Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="underline">Reset link</button>
        )}
      </p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Your private calendar link"
        className="w-full text-[12px] text-[#5A7A8A] bg-white/70 border border-[#E8DFC8] rounded-lg px-3 py-2 mb-4"
      />
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={alerts}
          onChange={(e) => toggleAlerts(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#0D5C6E]"
        />
        <span className="text-[14px] text-[#1C3A4A]">
          Email me a week before registration opens, the morning it opens, and if a session I added changes.
        </span>
      </label>
      {msg && <p className="text-[13px] text-[#7A5A2E] mt-3">{msg}</p>}
    </div>
  );
}

// ── Per-activity session picker ──────────────────────────────────────────────

const SHOW_FIRST = 6;

export function SessionPicker({
  activity,
  sessions,
  initialPicks,
  today,
}: {
  activity: { activityId: string; title: string; provider: string | null; website: string | null; neighborhood: string | null };
  sessions: CalendarSession[];
  initialPicks: CalendarPick[];
  today: string;
}) {
  const [picked, setPicked] = useState(() => new Set(initialPicks.filter((p) => p.status !== 'gone').map((p) => p.key)));
  const [gone, setGone] = useState(() => initialPicks.filter((p) => p.status === 'gone'));
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const changed = new Map(initialPicks.filter((p) => p.status === 'changed').map((p) => [p.key, p.changeNote]));

  if (!sessions.length && !gone.length) return null;

  async function send(key: string, action: 'add' | 'remove') {
    setBusyKey(key);
    setError('');
    try {
      const res = await fetch('/api/families/calendar/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.activityId, sessionKey: key, action }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Something went wrong. Please try again.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function toggle(key: string) {
    const isPicked = picked.has(key);
    if (await send(key, isPicked ? 'remove' : 'add')) {
      setPicked((prev) => {
        const next = new Set(prev);
        if (isPicked) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  }

  async function removeGone(key: string) {
    if (await send(key, 'remove')) setGone((g) => g.filter((p) => p.key !== key));
  }

  function download(s: CalendarSession) {
    const event = sessionEvent(activity, s.item, 'download', today);
    if (!event) return;
    const ics = buildCalendar({ name: activity.title, events: [event] });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'session'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const shown = showAll ? sessions : sessions.slice(0, SHOW_FIRST);
  const count = picked.size;

  return (
    <div className="mt-3">
      {sessions.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 h-9 rounded-full px-4 text-[13px] font-semibold transition-colors ${
            count ? 'bg-[#0D5C6E] text-white hover:bg-[#1A7A8A]' : 'border border-[#C5D8E8] text-[#0D5C6E] hover:bg-[#C5D8E8]/20'
          }`}
        >
          {count ? `✓ ${count} in your calendar` : 'Add to my calendar'}
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      )}

      {open && sessions.length > 0 && (
        <div className="mt-3 border border-[#E8DFC8] rounded-[14px] divide-y divide-[#E8DFC8]">
          <p className="px-4 py-2.5 text-[12px] text-[#7A9AAA]">Pick the session your child is in.</p>
          {shown.map((s) => {
            const isPicked = picked.has(s.key);
            return (
              <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-[#1C3A4A]">{s.text}</p>
                  {isPicked && changed.get(s.key) && (
                    <p className="text-[12px] text-[#7A5A2E] mt-0.5">Updated by the provider · {changed.get(s.key)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => download(s)}
                  title="Download this session for any calendar app"
                  aria-label={`Download ${s.text} as a calendar file`}
                  className="text-[12px] font-medium text-[#7A9AAA] hover:text-[#0D5C6E] shrink-0"
                >
                  .ics
                </button>
                <button
                  type="button"
                  onClick={() => toggle(s.key)}
                  disabled={busyKey === s.key}
                  className={`shrink-0 h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                    isPicked ? 'bg-[#0D5C6E] text-white hover:bg-[#C0544A]' : 'border border-[#C5D8E8] text-[#0D5C6E] hover:bg-[#C5D8E8]/20'
                  }`}
                >
                  {busyKey === s.key ? '…' : isPicked ? 'Added ✓' : 'Add'}
                </button>
              </div>
            );
          })}
          {sessions.length > SHOW_FIRST && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full px-4 py-2.5 text-[13px] font-semibold text-[#1A7A8A] text-left">
              {showAll ? 'Show fewer' : `Show all ${sessions.length} sessions`}
            </button>
          )}
        </div>
      )}

      {gone.map((p) => (
        <div key={p.key} className="mt-2 flex items-center gap-3 text-[13px] bg-[#C0544A]/5 border border-[#C0544A]/20 rounded-[12px] px-3 py-2">
          <span className="flex-1 text-[#7A3A30]">No longer on their schedule: {p.text}</span>
          <button type="button" onClick={() => removeGone(p.key)} disabled={busyKey === p.key} className="font-semibold text-[#7A3A30] underline disabled:opacity-50">
            Remove
          </button>
        </div>
      ))}

      {error && <p className="text-[13px] text-[#C0544A] mt-2">{error}</p>}
    </div>
  );
}

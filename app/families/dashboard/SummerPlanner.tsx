'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Kid } from '@/lib/calendar-grid';
import type { SummerIdea, SummerWeek, WeekCell } from '@/lib/summer';
import { Icon, iconFor, theme } from './rhythm-ui';

// Family Rhythm, Round 2: the Summer planner. Ten summer weeks × each child.
// A week is covered by a dated session on the calendar or by a camp the
// family "pencilled in"; open weeks offer ideas. Data: /api/families/summer
// (loaded when the planner is first opened).

interface SummerData {
  year: number;
  weeks: SummerWeek[];
  kids: { id: string; name: string; age: number | null; hasInterests: boolean }[];
  cells: Record<string, WeekCell>;
  ideas: Record<string, SummerIdea[]>;
  needsSetup: boolean;
}

type Open = { kidId: string; week: SummerWeek } | null;

export default function SummerPlanner({
  kids,
  reminders,
  onReminder,
}: {
  /** The family's kids (for colors). */
  kids: Kid[];
  /** "activityId|YYYY-MM-DD" registration reminders already set. */
  reminders: string[];
  onReminder: (activityId: string, date: string, on: boolean) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<SummerData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/families/summer', { cache: 'no-store' });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Could not load the summer.');
      setData(r as SummerData);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load the summer.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function say(text: string) {
    setToast(text);
    setTimeout(() => setToast(''), 3500);
  }

  async function act(body: Record<string, string>, done: string) {
    setBusy(body.activityId ?? 'erase');
    setError('');
    try {
      const res = await fetch('/api/families/summer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || 'Something went wrong. Please try again.');
      await load();
      setOpen(null);
      say(done);
      router.refresh(); // saved list, radar and alerts pick up a pencilled-in camp
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-[24px] p-6 text-[14px] text-[#7A5A2E]">
        {loadError}{' '}
        <button type="button" onClick={load} className="font-semibold underline">Try again</button>
      </div>
    );
  }
  if (!data) {
    return <div className="bg-white rounded-[24px] p-6 text-[14px] text-[#7A9AAA] animate-pulse">Laying out the summer…</div>;
  }
  if (!data.kids.length) {
    return (
      <div className="bg-white rounded-[24px] p-6 text-[14px] text-[#3A5A6A]">
        Add your kids in <a href="#family-profile" className="font-semibold text-[#1A7A8A] underline">your profile</a> to plan each child&apos;s summer, week by week.
      </div>
    );
  }

  const { weeks } = data;
  const t = (kidId: string) => theme(kids, kidId);
  const covered = (kidId: string) => weeks.filter((w) => data.cells[`${kidId}|${w.start}`]).length;
  const kidName = (kidId: string) => data.kids.find((k) => k.id === kidId)?.name ?? 'your child';

  function Cell({ kidId, week, tall }: { kidId: string; week: SummerWeek; tall?: boolean }) {
    const c = data!.cells[`${kidId}|${week.start}`];
    const th = t(kidId);
    const h = tall ? 'min-h-[112px]' : 'min-h-[84px]';
    if (c) {
      const solid = c.kind === 'calendar';
      return (
        <button
          type="button"
          onClick={() => setOpen({ kidId, week })}
          className={`w-full text-left rounded-[16px] p-2.5 ${h} flex flex-col transition-transform hover:-translate-y-0.5`}
          style={solid ? { background: th.color, color: '#fff' } : { background: th.soft, color: th.ink }}
        >
          <span className="mb-1"><Icon name={iconFor(c.category ?? c.title)} size={18} /></span>
          <span className="text-[12.5px] font-semibold leading-tight line-clamp-3 [overflow-wrap:anywhere] [hyphens:auto]" lang="en">{c.title}</span>
          <span className="text-[11px] opacity-75 mt-auto pt-1 leading-tight">{solid ? '✓ On your calendar' : c.signup}</span>
        </button>
      );
    }
    const list = data!.ideas[`${kidId}|${week.start}`] ?? [];
    const top = list[0];
    return (
      <button
        type="button"
        onClick={() => setOpen({ kidId, week })}
        aria-label={top ? `Open week of ${week.label}. Top idea: ${top.title}${list.length > 1 ? `, and ${list.length - 1} more` : ''}` : `Open week of ${week.label}. Find a camp`}
        className={`w-full rounded-[16px] ${h} px-2 py-2 border-2 border-dashed border-[#E3DAC5] hover:border-[#1A7A8A] hover:bg-[#F7FBFC] flex flex-col items-center justify-center gap-0.5 text-center transition-colors`}
      >
        <span className="text-[11px] text-[#B5A889] font-semibold uppercase tracking-[0.06em]">Open week</span>
        {top ? (
          <>
            <span className="text-[12px] text-[#1A7A8A] font-semibold leading-tight line-clamp-2 [overflow-wrap:anywhere] [hyphens:auto]" lang="en">
              {top.title}
            </span>
            <span className="text-[11px] text-[#7A9AAA] leading-tight">{list.length > 1 ? `+${list.length - 1} more →` : 'See it →'}</span>
          </>
        ) : (
          <span className="text-[12px] text-[#1A7A8A] font-semibold">Find a camp →</span>
        )}
      </button>
    );
  }

  const Avatar = ({ kidId, size = 36 }: { kidId: string; size?: number }) => (
    <div
      className="rounded-full flex items-center justify-center text-white font-['Cormorant_Garamond'] shrink-0"
      style={{ background: t(kidId).color, width: size, height: size, fontSize: size * 0.47 }}
    >
      {kidName(kidId)[0]}
    </div>
  );

  return (
    <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.08)] p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-['Cormorant_Garamond'] text-[30px] font-light leading-none text-[#1C3A4A]">Summer {data.year}</h3>
          <p className="text-[13px] text-[#7A9AAA] mt-1">
            Ten weeks{data.kids.length > 1 ? `, ${data.kids.length} kids` : ''}. Fill the gaps before signups open.
          </p>
        </div>
        <div className="flex gap-5">
          {data.kids.map((k) => (
            <div key={k.id} className="text-right">
              <p className="text-[12px] text-[#7A9AAA]">{k.name}</p>
              <p className="font-['Cormorant_Garamond'] text-[24px] leading-none [font-variant-numeric:lining-nums]" style={{ color: t(k.id).color }}>
                {covered(k.id)}
                <span className="text-[15px] text-[#B5C4CC]">/{weeks.length} weeks</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {data.needsSetup && (
        <p className="text-[13px] text-[#7A5A2E] bg-[#C4A882]/15 rounded-[12px] px-3 py-2 mb-4">Pencilling in camps isn’t switched on yet. Ideas below are ready to browse.</p>
      )}

      {/* Tablet / desktop: weeks across, a row per child */}
      <div className="hidden md:block overflow-x-auto -mx-6 px-6">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `76px repeat(${weeks.length}, minmax(88px, 1fr))`, minWidth: 76 + weeks.length * 94 }}>
          <div />
          {weeks.map((w) => (
            <div key={w.start} className="text-center pb-1">
              <p className="text-[10.5px] uppercase tracking-wider text-[#7A9AAA] font-semibold">Week of</p>
              <p className="font-['Cormorant_Garamond'] text-[18px] leading-tight text-[#1C3A4A] [font-variant-numeric:lining-nums]">{w.label}</p>
              <p className="text-[10.5px] text-[#C0544A] h-3.5">{w.note}</p>
            </div>
          ))}
          {data.kids.map((k) => (
            <div key={k.id} className="contents">
              <div className="flex flex-col items-center justify-center gap-1">
                <Avatar kidId={k.id} />
                <span className="text-[12px] font-semibold text-[#1C3A4A] text-center leading-tight">{k.name}</span>
              </div>
              {weeks.map((w) => (
                <Cell key={w.start} kidId={k.id} week={w} tall />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Phone: a row per week, a column per child */}
      <div className="md:hidden overflow-x-auto -mx-4 px-4">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `58px repeat(${data.kids.length}, minmax(120px, 1fr))` }}>
          <div />
          {data.kids.map((k) => (
            <div key={k.id} className="flex items-center gap-2 pb-1">
              <Avatar kidId={k.id} size={28} />
              <span className="text-[13px] font-semibold text-[#1C3A4A]">{k.name}</span>
            </div>
          ))}
          {weeks.map((w) => (
            <div key={w.start} className="contents">
              <div className="flex flex-col justify-center">
                <p className="font-['Cormorant_Garamond'] text-[17px] leading-tight text-[#1C3A4A] [font-variant-numeric:lining-nums]">{w.label}</p>
                {w.note && <p className="text-[10px] text-[#C0544A] leading-tight">{w.note}</p>}
              </div>
              {data.kids.map((k) => (
                <Cell key={k.id} kidId={k.id} week={w} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-[#7A9AAA] mt-4">
        Signup dates fill in as providers post them. Pencilling in a camp saves it, so it shows on your Signup radar and you can get a reminder.
      </p>

      {/* Week sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Summer week">
          <div className="absolute inset-0 bg-[#1C3A4A]/35" onClick={() => setOpen(null)} />
          <div className="relative bg-white w-full sm:max-w-[520px] rounded-t-[28px] sm:rounded-[28px] p-6 pb-8 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 rounded-full bg-[#E3DAC5] mx-auto -mt-2 mb-4" />
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full hover:bg-[#F5EFE0] text-[#7A9AAA] text-[20px]">×</button>
            <WeekSheet
              open={open}
              data={data}
              color={t(open.kidId).color}
              soft={t(open.kidId)}
              busy={busy}
              error={error}
              reminders={reminders}
              onReminder={onReminder}
              onPencil={(idea) =>
                act({ action: 'pencil', kidId: open.kidId, week: open.week.start, activityId: idea.activityId }, `${idea.title} pencilled in for ${kidName(open.kidId)}.`)
              }
              onErase={() => act({ action: 'erase', kidId: open.kidId, week: open.week.start }, `Week of ${open.week.label} is open again.`)}
            />
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-[#1C3A4A] text-white text-[14px] rounded-full px-5 py-3 shadow-lg max-w-[92vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

function WeekSheet({
  open,
  data,
  color,
  soft,
  busy,
  error,
  reminders,
  onReminder,
  onPencil,
  onErase,
}: {
  open: { kidId: string; week: SummerWeek };
  data: SummerData;
  color: string;
  soft: { soft: string; ink: string };
  busy: string | null;
  error: string;
  reminders: string[];
  onReminder: (activityId: string, date: string, on: boolean) => void;
  onPencil: (idea: SummerIdea) => void;
  onErase: () => void;
}) {
  const kid = data.kids.find((k) => k.id === open.kidId)!;
  const cell = data.cells[`${open.kidId}|${open.week.start}`];
  const ideas = data.ideas[`${open.kidId}|${open.week.start}`] ?? [];
  const head = (
    <p className="text-[12px] font-semibold mb-1" style={{ color }}>
      {kid.name}
      {kid.age != null ? ` · age ${kid.age}` : ''} · week of {open.week.label}
      {open.week.note ? ` · ${open.week.note}` : ''}
    </p>
  );

  if (cell) {
    const reminded = cell.opens ? reminders.includes(`${cell.activityId}|${cell.opens}`) : false;
    return (
      <>
        {head}
        <p className="font-['Cormorant_Garamond'] text-[26px] leading-tight text-[#1C3A4A]">{cell.title}</p>
        {cell.provider && <p className="text-[14px] text-[#3A5A6A] mt-1">{cell.provider}</p>}
        <p className="inline-block text-[12px] font-semibold rounded-full px-3 py-1 mt-3" style={{ background: soft.soft, color: soft.ink }}>
          {cell.kind === 'calendar' ? '✓ A session you added runs this week' : `Pencilled in · ${cell.signup}`}
        </p>
        {error && <p className="text-[13px] text-[#C0544A] mt-3">{error}</p>}
        <div className="flex flex-wrap gap-2 mt-5">
          {cell.website && (
            <a href={cell.website} target="_blank" rel="noopener noreferrer" className="h-10 inline-flex items-center px-4 rounded-full bg-[#0D5C6E] text-white text-[13px] font-semibold">
              Their site →
            </a>
          )}
          {cell.opens && (
            <button
              type="button"
              onClick={() => onReminder(cell.activityId, cell.opens!, !reminded)}
              className={`h-10 px-4 rounded-full text-[13px] font-semibold ${reminded ? 'bg-[#C4A882] text-[#1C3A4A]' : 'border border-[#C5D8E8] text-[#0D5C6E]'}`}
            >
              {reminded ? '✓ Reminder set' : 'Remind me when signups open'}
            </button>
          )}
          {cell.kind === 'pencil' && (
            <button type="button" onClick={onErase} disabled={!!busy} className="h-10 px-4 rounded-full text-[#C0544A] text-[13px] font-semibold disabled:opacity-50">
              {busy ? 'Erasing…' : 'Erase from plan'}
            </button>
          )}
        </div>
        {cell.kind === 'calendar' && <p className="text-[12px] text-[#7A9AAA] mt-3">Change it from the activity in your saved list below.</p>}
      </>
    );
  }

  return (
    <>
      {head}
      <p className="font-['Cormorant_Garamond'] text-[26px] leading-tight text-[#1C3A4A] mb-4">Ideas for this week</p>
      {error && <p className="text-[13px] text-[#C0544A] mb-3">{error}</p>}
      {data.needsSetup && <p className="text-[13px] text-[#7A5A2E] mb-3">Pencilling in isn’t switched on yet, so these are to browse for now.</p>}
      {ideas.length === 0 && (
        <p className="text-[14px] text-[#3A5A6A] mb-3">
          Nothing from our list fits {kid.name} this week yet. Camps are added all the time.
        </p>
      )}
      {ideas.map((idea) => (
        <div key={idea.activityId} className="flex items-center gap-3 rounded-[16px] border border-[#EFE7D4] p-3 mb-2">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: soft.soft, color: soft.ink }}>
            <Icon name={iconFor(idea.category)} size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-[14.5px] text-[#1C3A4A] leading-snug">{idea.title}</span>
            <span className="block text-[12px] text-[#7A9AAA]">{[idea.provider, idea.neighborhood].filter(Boolean).join(' · ')}</span>
            <span className="block text-[12px] text-[#5A7A8A] mt-0.5">
              {idea.why} · {idea.signup}
            </span>
          </span>
          <span className="flex flex-col items-end gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onPencil(idea)}
              disabled={!!busy || data.needsSetup}
              className="h-9 px-3.5 rounded-full text-[12.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: color }}
            >
              {busy === idea.activityId ? '…' : 'Pencil in'}
            </button>
            {idea.website && (
              <a href={idea.website} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#1A7A8A]">
                Details →
              </a>
            )}
          </span>
        </div>
      ))}
      <a href={`/discover?for=${encodeURIComponent(kid.id)}`} className="inline-block mt-3 text-[13px] font-semibold text-[#1A7A8A]">
        Browse everything for {kid.name} →
      </a>
    </>
  );
}

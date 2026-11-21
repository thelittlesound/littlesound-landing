'use client';

// Saved activities on the family dashboard (approved 2026-11-20, canvas
// https://claude.ai/artifact/EUtavJuUysZ3SSMzXS88Ny): grouped by category in
// Discover's order, one compact row each with Discover's four facts (When,
// Ages, Where, Cost), and a filter per child. Rows stack into small cards on
// phones.

import { useState, type ReactNode } from 'react';
import { CATEGORY_NAMES, CATEGORY_TINTS, normalizeCategory } from '@/lib/categories';
import { kidColor, kidLabel, type Kid } from '@/lib/calendar-grid';
import { LineIcon } from '@/app/components/LineIcon';
import type { SavedActivity } from './DashboardClient';

function agesText(s: SavedActivity): { v: string; warn?: boolean } {
  if (s.age_min == null && s.age_max == null) return { v: 'Check their site', warn: true };
  const min = s.age_min ?? 0, max = s.age_max ?? 18;
  if (max >= 18) return { v: min > 0 ? `${min}+` : 'All ages' };
  return { v: `${min}–${max}` };
}
function costText(s: SavedActivity): { v: string; muted?: boolean } {
  if (s.price == null) return { v: 'Fees on their site', muted: true };
  if (s.price === 0) return { v: 'Free' };
  return { v: `$${s.price}${s.price_unit ? ` / ${s.price_unit}` : ''}` };
}

export default function SavedList({ saved, kids, dateLines, removingId, onRemove, sessions }: {
  saved: SavedActivity[];
  kids: Kid[];
  dateLines: Record<string, string>;
  removingId: string | null;
  onRemove: (activityId: string) => void;
  /** The session picker for one saved activity (null when it has no sessions). */
  sessions: (s: SavedActivity) => ReactNode;
}) {
  const [kidFilter, setKidFilter] = useState('all');

  // Children with at least one save; only they get a chip.
  const kidChips = kids
    .map((k, i) => ({ id: k.id, label: kidLabel(k, i), color: kidColor(kids, k.id), n: saved.filter((s) => s.kid_id === k.id).length }))
    .filter((k) => k.n > 0);
  const active = kidChips.some((k) => k.id === kidFilter) ? kidFilter : 'all';
  const shown = active === 'all' ? saved : saved.filter((s) => s.kid_id === active);

  const byCat = new Map<string, SavedActivity[]>();
  for (const s of shown) {
    const c = normalizeCategory(s.category);
    byCat.set(c, [...(byCat.get(c) ?? []), s]);
  }
  const order = [...CATEGORY_NAMES, ...[...byCat.keys()].filter((c) => !CATEGORY_NAMES.includes(c))];
  const groups = order.filter((c) => byCat.has(c)).map((c) => ({ name: c, rows: byCat.get(c)! }));

  const chip = (on: boolean) =>
    `min-h-[36px] px-3.5 rounded-pill text-[13px] border-[1.5px] inline-flex items-center gap-1.5 transition-colors ${
      on ? 'bg-teal-800 border-teal-800 text-white font-semibold' : 'bg-white border-cream-700 text-text-dark font-medium hover:border-teal-700'
    }`;

  return (
    <section className="flex flex-col gap-[18px]" aria-labelledby="saved-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="saved-heading" className="font-display text-[32px] font-normal leading-[1.1] text-text-dark">Saved activities</h2>
          {saved.length > 0 && <span className="text-[13px] text-text-mid">{shown.length} saved</span>}
        </div>
        {kidChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show saved activities for">
            <button type="button" aria-pressed={active === 'all'} onClick={() => setKidFilter('all')} className={chip(active === 'all')}>
              Everyone <span className={active === 'all' ? 'opacity-80 font-medium' : 'text-text-mid'}>{saved.length}</span>
            </button>
            {kidChips.map((k) => (
              <button key={k.id} type="button" aria-pressed={active === k.id} onClick={() => setKidFilter(k.id)} className={chip(active === k.id)}>
                {active !== k.id && <span className="w-2 h-2 rounded-full" style={{ background: k.color }} />}
                {k.label} <span className={active === k.id ? 'opacity-80 font-medium' : 'text-text-mid'}>{k.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {saved.length === 0 ? (
        <div className="bg-white rounded-[18px] shadow-[0_4px_20px_rgba(10,74,90,0.07)] text-center px-6 py-8">
          <p className="text-[15px] text-text-mid mb-4">
            You haven&apos;t saved anything yet. Tap the heart on any activity to keep it here.
          </p>
          <a href="/discover" className="inline-flex items-center justify-center h-11 rounded-full bg-teal-800 text-white font-semibold text-[14px] px-6 hover:bg-teal-700 transition-colors">
            Browse activities →
          </a>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.name} className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-[30px] h-[30px] rounded-[10px] inline-flex items-center justify-center" style={{ background: CATEGORY_TINTS[g.name] ?? '#F3EBDD' }}>
                <LineIcon name={g.name} size={18} color="#8A6A3E" />
              </span>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-teal-700">{g.name}</h3>
              <span className="text-[12px] text-text-mid">{g.rows.length}</span>
            </div>
            <div className="bg-white rounded-[18px] shadow-[0_4px_20px_rgba(10,74,90,0.07)] overflow-hidden">
              {g.rows.map((s, i) => {
                const kidI = s.kid_id ? kids.findIndex((k) => k.id === s.kid_id) : -1;
                const color = kidI >= 0 ? kidColor(kids, s.kid_id) : null;
                const when = dateLines[s.activity_id];
                const ages = agesText(s);
                const cost = costText(s);
                const facts = [
                  { k: 'When', v: when || 'Schedule on their site', muted: !when },
                  { k: 'Ages', v: ages.v, warn: ages.warn },
                  { k: 'Where', v: s.neighborhood === 'Citywide' ? 'Several locations' : s.neighborhood || '—' },
                  { k: 'Cost', v: cost.v, muted: cost.muted },
                ];
                const picker = sessions(s);
                return (
                  <article key={s.activity_id} className={`flex flex-wrap items-center gap-x-[18px] gap-y-2.5 px-4 py-3.5 ${i ? 'border-t border-cream-700' : ''}`}>
                    <div className="flex-[1_1_240px] min-w-0 flex flex-col gap-0.5">
                      {color && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color }}>
                          <span className="w-[7px] h-[7px] rounded-full" style={{ background: color }} />
                          For {kidLabel(kids[kidI], kidI)}
                        </span>
                      )}
                      <h4 className="font-display text-[20px] font-medium leading-[1.15] text-text-dark">{s.title}</h4>
                      {s.provider && <span className="text-[13px] text-text-mid">{s.provider}</span>}
                    </div>
                    <dl className="flex-[2_1_330px] min-w-0 grid grid-cols-4 gap-x-3 gap-y-2 px-3 py-2.5 rounded-[12px] bg-cream-300">
                      {facts.map((f) => (
                        <div key={f.k} className="min-w-0">
                          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-mid">{f.k}</dt>
                          <dd className={`mt-0.5 text-[12.5px] leading-[1.3] ${f.warn ? 'text-gold-deep' : f.muted ? 'text-text-mid' : 'text-text-dark'}`}>{f.v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex-none flex items-center gap-1 ml-auto">
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="min-h-[44px] px-2.5 inline-flex items-center text-[13px] font-semibold text-teal-700 hover:text-teal-800">
                          Details ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(s.activity_id)}
                        disabled={removingId === s.activity_id}
                        aria-label={`Remove ${s.title ?? 'this activity'} from saved`}
                        title="Remove from saved"
                        className="w-11 h-11 rounded-full inline-flex items-center justify-center hover:bg-cream-300 transition-colors disabled:opacity-50"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#0D5C6E" stroke="#0D5C6E" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" />
                        </svg>
                      </button>
                    </div>
                    {picker && <div className="basis-full -mt-3">{picker}</div>}
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

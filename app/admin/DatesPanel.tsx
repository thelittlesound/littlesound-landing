'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WEEKDAYS, type DateItem } from '@/lib/activity-dates';

interface Listing {
  activityId: string;
  title: string;
  business: string;
  website: string | null;
  dateCount: number;
  lastApprovedAt: string | null;
}

// A draft row in the editor: DateItem with '' instead of null, plus a local key.
interface Row {
  key: number;
  kind: 'session' | 'registration';
  label: string;
  start_date: string;
  end_date: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  source_excerpt: string;
}

const DAY_LABEL: Record<string, string> = { MO: 'M', TU: 'T', WE: 'W', TH: 'Th', FR: 'F', SA: 'Sa', SU: 'Su' };
let nextKey = 1;

function toRow(i: DateItem): Row {
  return {
    key: nextKey++,
    kind: i.kind,
    label: i.label ?? '',
    start_date: i.start_date ?? '',
    end_date: i.end_date ?? '',
    days_of_week: i.days_of_week ?? [],
    start_time: (i.start_time ?? '').slice(0, 5),
    end_time: (i.end_time ?? '').slice(0, 5),
    location: i.location ?? '',
    notes: i.notes ?? '',
    source_excerpt: i.source_excerpt ?? '',
  };
}

function emptyRow(kind: Row['kind']): Row {
  return toRow({
    kind, label: null, start_date: null, end_date: null, days_of_week: null,
    start_time: null, end_time: null, location: null, notes: null, source_excerpt: null,
  });
}

// What gets compared (to know if there are unsaved changes) and sent on save.
function toPayload(rows: Row[]) {
  return rows.map(({ key, ...r }) => ({ ...r, days_of_week: r.kind === 'session' ? r.days_of_week : [] }));
}

// The AI date tool: pick a listing, paste the provider's schedule text, let
// Claude draft the dates, correct them, save. Only saved dates reach families.
export default function DatesPanel({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const toastRef = useRef(onToast); // see ClaimsPanel: keep the parent's new-every-render callback out of deps
  toastRef.current = onToast;

  const [listings, setListings] = useState<Listing[]>([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState<'needs' | 'has' | 'all'>('needs');
  const [query, setQuery] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedRows, setSavedRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [meta, setMeta] = useState<{ approvedAt: string | null; approvedBy: string | null }>({ approvedAt: null, approvedBy: null });
  const [loadingDates, setLoadingDates] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/dates');
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      setListings(data.listings || []);
      setAiConfigured(!!data.aiConfigured);
      setTableMissing(!!data.tableMissing);
    } catch {
      toastRef.current('Failed to load listings', false);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const selected = listings.find((l) => l.activityId === selectedId) ?? null;
  const withDates = listings.filter((l) => l.dateCount > 0).length;
  const dirty = JSON.stringify(toPayload(rows)) !== JSON.stringify(toPayload(savedRows));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings
      .filter((l) => (filter === 'needs' ? l.dateCount === 0 : filter === 'has' ? l.dateCount > 0 : true))
      .filter((l) => !q || l.title.toLowerCase().includes(q) || l.business.toLowerCase().includes(q))
      .sort((a, b) => a.business.localeCompare(b.business) || a.title.localeCompare(b.title));
  }, [listings, filter, query]);

  async function open(l: Listing) {
    if (dirty && !window.confirm('Discard unsaved changes to the current listing?')) return;
    setSelectedId(l.activityId);
    setRows([]); setSavedRows([]); setWarnings([]); setPasted(''); setConfirmClear(false);
    setSourceUrl(l.website ?? '');
    setLoadingDates(true);
    try {
      const res = await fetch(`/api/admin/dates/${encodeURIComponent(l.activityId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const loaded = (data.items as DateItem[]).map(toRow);
      setSavedRows(loaded);
      setRows(loaded.map((r) => ({ ...r }))); // same keys: an untouched copy isn't "dirty"
      if (data.sourceUrl) setSourceUrl(data.sourceUrl);
      setMeta({ approvedAt: data.approvedAt, approvedBy: data.approvedBy });
    } catch (e) {
      toastRef.current(e instanceof Error && e.message ? e.message : 'Failed to load dates', false);
    } finally {
      setLoadingDates(false);
    }
  }

  async function extract() {
    if (!selected || !pasted.trim()) return;
    setExtracting(true);
    setWarnings([]);
    try {
      const res = await fetch('/api/admin/dates/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: selected.activityId, text: pasted, sourceUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      const found = (data.items as DateItem[]).map(toRow);
      setRows((prev) => [...prev, ...found]);
      setWarnings(data.warnings || []);
      toastRef.current(
        found.length ? `AI found ${found.length} date${found.length === 1 ? '' : 's'} — review before saving` : 'AI found no dates in that text',
        found.length > 0
      );
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : 'Extraction failed', false);
    } finally {
      setExtracting(false);
    }
  }

  async function save(nextRows: Row[]) {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/dates/${encodeURIComponent(selected.activityId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toPayload(nextRows), sourceUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSavedRows(nextRows.map((r) => ({ ...r })));
      setRows(nextRows);
      setConfirmClear(false);
      setMeta({ approvedAt: new Date().toISOString(), approvedBy: 'you' });
      toastRef.current(nextRows.length ? `Saved ${nextRows.length} date${nextRows.length === 1 ? '' : 's'}` : 'Dates cleared', true);
      fetchListings();
    } catch (e) {
      toastRef.current(e instanceof Error ? e.message : 'Save failed', false);
    } finally {
      setSaving(false);
    }
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function toggleDay(key: number, day: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? { ...r, days_of_week: r.days_of_week.includes(day) ? r.days_of_week.filter((d) => d !== day) : [...r.days_of_week, day] }
          : r
      )
    );
  }

  const input = 'w-full border border-[#E8DFC8] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[#0D5C6E] bg-white';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-5">
      {/* ── Listing picker ─────────────────────────────────────────────── */}
      <div className="w-full md:w-80 shrink-0">
        {tableMissing && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 text-sm text-red-700">
            The dates table doesn&apos;t exist yet. Run <code>supabase/activity-dates.sql</code> in Supabase.
          </div>
        )}
        <div className="bg-white rounded-2xl border border-[#E8DFC8] px-4 py-3 mb-3">
          <p className="text-sm text-[#1C3A4A]">
            <strong>{withDates}</strong> of {listings.length} listings have dates
          </p>
          <div className="h-1.5 bg-[#F5EFE0] rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-[#0D5C6E] rounded-full"
              style={{ width: `${listings.length ? (withDates / listings.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1.5 mb-2">
          {([['needs', 'Needs dates'], ['has', 'Has dates'], ['all', 'All']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filter === k ? 'bg-[#0D5C6E] text-white' : 'bg-white text-[#0D5C6E] border border-[#C5D8E8] hover:bg-[#C5D8E8]/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings"
          className="w-full border border-[#E8DFC8] rounded-full px-4 py-2 text-sm outline-none focus:border-[#0D5C6E] mb-2 bg-white"
        />
        {loadingList ? (
          <p className="text-[#7A9AAA] text-sm py-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {visible.map((l) => (
              <button
                key={l.activityId}
                onClick={() => open(l)}
                className={`w-full text-left bg-white rounded-xl border px-3 py-2.5 transition-colors ${
                  selectedId === l.activityId ? 'border-[#0D5C6E]' : 'border-[#E8DFC8] hover:border-[#C5D8E8]'
                }`}
              >
                <p className="text-sm font-semibold text-[#1C3A4A] truncate">{l.title}</p>
                <p className="text-xs text-[#7A9AAA] truncate">
                  {l.business}
                  {l.dateCount > 0 ? ` · ${l.dateCount} date${l.dateCount === 1 ? '' : 's'}` : ''}
                </p>
              </button>
            ))}
            {visible.length === 0 && <p className="text-[#7A9AAA] text-sm py-6 text-center">Nothing here.</p>}
          </div>
        )}
      </div>

      {/* ── Editor ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="bg-white rounded-2xl border border-[#E8DFC8] p-8 text-center">
            <p className="text-[#7A9AAA] text-sm">Pick a listing from the list to add or check its dates.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8DFC8] p-5">
            <div className="mb-4">
              <h2 className="font-['Cormorant_Garamond'] text-2xl font-light text-[#0D5C6E] leading-tight">{selected.title}</h2>
              <p className="text-sm text-[#7A9AAA]">
                {selected.business}
                {selected.website && (
                  <>
                    {' · '}
                    <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-[#1A7A8A] underline">
                      open their site ↗
                    </a>
                  </>
                )}
              </p>
              {meta.approvedAt && savedRows.length > 0 && (
                <p className="text-xs text-[#B0C8D0] mt-1">
                  {savedRows.length} saved · last approved {new Date(meta.approvedAt).toLocaleDateString()}
                  {meta.approvedBy ? ` by ${meta.approvedBy}` : ''}
                </p>
              )}
            </div>

            {/* Paste + extract */}
            <div className="bg-[#F5EFE0] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-2">1 · Paste the schedule from their site</p>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Page URL the dates came from"
                className={`${input} mb-2`}
              />
              <textarea
                rows={5}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Select the schedule / registration section on the provider's page, copy, and paste it here."
                className={`${input} resize-y mb-2`}
              />
              {!aiConfigured && (
                <p className="text-xs text-amber-800 mb-2">
                  AI extraction isn&apos;t set up yet (no ANTHROPIC_API_KEY in Vercel). You can still add dates by hand below.
                </p>
              )}
              <button
                onClick={extract}
                disabled={!aiConfigured || extracting || !pasted.trim()}
                className="bg-[#0D5C6E] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-50"
              >
                {extracting ? 'Reading the page…' : 'Extract dates with AI'}
              </button>
              {aiConfigured && !pasted.trim() && !extracting && (
                <p className="text-xs text-[#7A9AAA] mt-2">Paste the schedule text above to enable the button.</p>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Double-check</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-900">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review rows */}
            <p className="text-xs text-[#7A9AAA] uppercase tracking-wider mb-2">2 · Review — only saved dates reach families</p>
            {loadingDates ? (
              <p className="text-[#7A9AAA] text-sm py-4">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-[#7A9AAA] mb-3">No dates yet.</p>
            ) : (
              <div className="space-y-3 mb-3">
                {rows.map((r) => {
                  const isReg = r.kind === 'registration';
                  return (
                    <div key={r.key} className="border border-[#E8DFC8] rounded-xl p-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <select
                          value={r.kind}
                          onChange={(e) => update(r.key, { kind: e.target.value as Row['kind'] })}
                          className={`${input} w-auto`}
                        >
                          <option value="session">Session</option>
                          <option value="registration">Registration</option>
                        </select>
                        <input
                          value={r.label}
                          onChange={(e) => update(r.key, { label: e.target.value })}
                          placeholder={isReg ? 'e.g. Summer 2027 registration' : 'e.g. Week 3: Robotics (ages 8–10)'}
                          className={`${input} flex-1 min-w-[180px]`}
                        />
                        <button
                          onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                          className="text-xs text-red-600 hover:underline px-1"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <label className="text-[11px] text-[#7A9AAA]">
                          {isReg ? 'Opens' : 'Starts'}
                          <input type="date" value={r.start_date} onChange={(e) => update(r.key, { start_date: e.target.value })} className={input} />
                        </label>
                        <label className="text-[11px] text-[#7A9AAA]">
                          {isReg ? 'Open time' : 'Start time'}
                          <input type="time" value={r.start_time} onChange={(e) => update(r.key, { start_time: e.target.value })} className={input} />
                        </label>
                        <label className="text-[11px] text-[#7A9AAA]">
                          {isReg ? 'Closes' : 'Ends'}
                          <input type="date" value={r.end_date} onChange={(e) => update(r.key, { end_date: e.target.value })} className={input} />
                        </label>
                        <label className="text-[11px] text-[#7A9AAA]">
                          {isReg ? 'Close time' : 'End time'}
                          <input type="time" value={r.end_time} onChange={(e) => update(r.key, { end_time: e.target.value })} className={input} />
                        </label>
                      </div>
                      {!isReg && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-[11px] text-[#7A9AAA] mr-1">Meets</span>
                          {WEEKDAYS.map((d) => (
                            <button
                              key={d}
                              onClick={() => toggleDay(r.key, d)}
                              className={`w-8 h-7 rounded-md text-xs font-medium border ${
                                r.days_of_week.includes(d)
                                  ? 'bg-[#0D5C6E] border-[#0D5C6E] text-white'
                                  : 'bg-white border-[#E8DFC8] text-[#3A5A6A]'
                              }`}
                            >
                              {DAY_LABEL[d]}
                            </button>
                          ))}
                          <span className="text-[11px] text-[#B0C8D0] ml-1">(weekly classes: leave dates blank if it runs year-round)</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input value={r.location} onChange={(e) => update(r.key, { location: e.target.value })} placeholder="Location (optional)" className={input} />
                        <input value={r.notes} onChange={(e) => update(r.key, { notes: e.target.value })} placeholder="Notes for parents (optional)" className={input} />
                      </div>
                      {r.source_excerpt && (
                        <p className="text-xs text-[#7A9AAA] italic mt-2">From the page: “{r.source_excerpt}”</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setRows((p) => [...p, emptyRow('registration')])} className="text-sm text-[#1A7A8A] border border-[#C5D8E8] rounded-full px-3 py-1 hover:bg-[#C5D8E8]/20">
                + Registration window
              </button>
              <button onClick={() => setRows((p) => [...p, emptyRow('session')])} className="text-sm text-[#1A7A8A] border border-[#C5D8E8] rounded-full px-3 py-1 hover:bg-[#C5D8E8]/20">
                + Session
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#E8DFC8]">
              <button
                onClick={() => save(rows)}
                disabled={saving || !dirty}
                className="bg-[#0D5C6E] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : `Save ${rows.length} date${rows.length === 1 ? '' : 's'}`}
              </button>
              {dirty && (
                <button
                  onClick={() => { setRows(savedRows.map((r) => ({ ...r }))); setWarnings([]); }}
                  className="text-sm text-[#7A9AAA] hover:text-[#0D5C6E] px-2"
                >
                  Discard changes
                </button>
              )}
              {savedRows.length > 0 && (
                confirmClear ? (
                  <button onClick={() => save([])} disabled={saving} className="text-sm text-red-600 font-semibold px-2 ml-auto">
                    Confirm: remove all {savedRows.length} saved dates
                  </button>
                ) : (
                  <button onClick={() => setConfirmClear(true)} className="text-sm text-red-600 hover:underline px-2 ml-auto">
                    Clear all dates
                  </button>
                )
              )}
              <p className="w-full text-xs text-[#B0C8D0] mt-1">Saving replaces this listing&apos;s dates with exactly what&apos;s shown above.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

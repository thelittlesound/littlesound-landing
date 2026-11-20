'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Agent tab → "Find new providers": the discovery agent's searches (a sport
// in an area), when each last ran, and buttons to run them now. Results land
// in Suggestions below; nothing goes live without Add.

interface Query {
  key: string;
  sport: string;
  area: string;
  lastRunAt: string | null;
  lastStatus: string | null;
  found: number;
  added: number;
  message: string | null;
  due: boolean;
}
interface Overview {
  tableMissing: boolean;
  refreshDays: number;
  aiConfigured: boolean;
  queries: Query[];
}

const card = 'bg-white rounded-2xl border border-cream-700 p-5';

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

export default function DiscoveryPanel({ onNewSuggestions }: { onNewSuggestions: () => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<{ done: number; total: number; added: number; current: string } | null>(null);
  const [stopAsked, setStopAsked] = useState(false);
  const stopRef = useRef(false);
  const [log, setLog] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/discovery', { cache: 'no-store' });
    if (!res.ok) {
      setError(res.status === 401 ? 'Signed out. Reload and sign in.' : 'Could not load the searches.');
      return;
    }
    setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // One search at a time from this browser (each takes ~20–50s). Keep the tab open.
  async function run(keys: string[]) {
    if (!data) return;
    setStopAsked(false);
    stopRef.current = false;
    setLog([]);
    let added = 0;
    let stop = false;
    for (let i = 0; i < keys.length && !stop; i++) {
      const q = data.queries.find((x) => x.key === keys[i])!;
      setRunning({ done: i, total: keys.length, added, current: `${q.sport} · ${q.area}` });
      try {
        const res = await fetch('/api/admin/discovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: q.key }),
        });
        const r = await res.json().catch(() => ({}));
        if (res.status === 401) stop = true;
        added += r.added ?? 0;
        setLog((l) => [`${q.sport} · ${q.area}: ${r.message ?? r.error ?? `HTTP ${res.status}`}`, ...l]);
        if (r.added) onNewSuggestions();
      } catch {
        setLog((l) => [`${q.sport} · ${q.area}: request failed`, ...l]);
      }
      if (stopRef.current) stop = true;
    }
    setRunning(null);
    load();
  }

  if (error) return <div className={card}><p className="text-sm text-error-dark">{error}</p></div>;
  if (!data) return <div className={card}><p className="text-sm text-text-muted">Loading searches…</p></div>;

  const due = data.queries.filter((q) => q.due);
  const ranOnce = data.queries.filter((q) => q.lastRunAt);
  const addedTotal = data.queries.reduce((n, q) => n + q.added, 0);
  const sports = [...new Set(data.queries.map((q) => q.sport))];
  const areas = [...new Set(data.queries.map((q) => q.area))];
  const cell = (sport: string, area: string) => data.queries.find((q) => q.sport === sport && q.area === area)!;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-dark mb-1">Find new providers</h3>
          <p className="text-xs text-text-muted max-w-xl">
            Searches the web topic by topic (sports, arts, music, camps and more) in West Seattle, Delridge, White Center, South Park and Burien, reads each provider&apos;s own site, and adds what isn&apos;t
            on Little Sound to Suggestions below. Each search re-runs every {data.refreshDays} days, one or two a day on its own.
          </p>
        </div>
        {running ? (
          <div className="text-right">
            <p className="text-sm text-teal-800 font-medium">
              Searching {running.current}… ({running.done + 1} of {running.total})
            </p>
            <button onClick={() => { stopRef.current = true; setStopAsked(true); }} disabled={stopAsked} className="text-xs text-teal-700 underline disabled:opacity-50">
              {stopAsked ? 'Stopping after this one…' : 'Stop after this one'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={() => run(due.map((q) => q.key))}
              disabled={data.tableMissing || !data.aiConfigured || due.length === 0}
              className="bg-teal-800 text-white rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              {due.length ? `Run ${due.length} due search${due.length === 1 ? '' : 'es'}` : 'All searches are current'}
            </button>
            {confirmAll ? (
              <span className="text-xs text-text-dark">
                Re-run all {data.queries.length} now (about ${Math.round(data.queries.length * 0.15)}–{Math.round(data.queries.length * 0.3)})?{' '}
                <button
                  onClick={() => { setConfirmAll(false); run(data.queries.map((q) => q.key)); }}
                  className="font-semibold text-teal-800 underline"
                >
                  Yes
                </button>{' '}
                <button onClick={() => setConfirmAll(false)} className="text-teal-700 underline">Cancel</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmAll(true)}
                disabled={data.tableMissing || !data.aiConfigured}
                className="text-xs text-teal-700 underline disabled:opacity-50"
              >
                Re-run every search now
              </button>
            )}
          </div>
        )}
      </div>

      {data.tableMissing && (
        <p className="text-sm text-gold-deep bg-warning-light rounded-lg px-3 py-2 mb-3">Run <code>supabase/discovery.sql</code> in Supabase to switch this on.</p>
      )}
      {!data.aiConfigured && <p className="text-sm text-gold-deep bg-warning-light rounded-lg px-3 py-2 mb-3">ANTHROPIC_API_KEY isn&apos;t set in Vercel.</p>}

      <p className="text-xs text-text-mid mb-2">
        {ranOnce.length} of {data.queries.length} searches run · {addedTotal} suggestion{addedTotal === 1 ? '' : 's'} filed · about 3 web searches each
        (~$0.03) plus AI reading, roughly $0.15–0.30 per search in all. Keep this tab open while it runs.
      </p>

      {log.length > 0 && (
        <ul className="text-xs text-text-dark bg-cream-500 rounded-lg p-3 mb-3 space-y-0.5 max-h-40 overflow-y-auto">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      <button onClick={() => setOpen((o) => !o)} className="text-xs text-teal-700 underline">
        {open ? 'Hide every search' : 'Show every search'}
      </button>
      {open && (
        <div className="overflow-x-auto mt-3">
          <table className="text-xs w-full">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-1 pr-3 font-medium">Sport</th>
                {areas.map((a) => <th key={a} className="py-1 pr-3 font-medium">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {sports.map((s) => (
                <tr key={s} className="border-t border-cream-700">
                  <td className="py-1.5 pr-3 text-text-dark font-medium whitespace-nowrap">{s}</td>
                  {areas.map((a) => {
                    const q = cell(s, a);
                    return (
                      <td key={a} className="py-1.5 pr-3 align-top">
                        <button
                          onClick={() => run([q.key])}
                          disabled={!!running || data.tableMissing}
                          title={q.message ?? 'Run this search now'}
                          className={`text-left hover:underline disabled:no-underline ${q.lastStatus === 'error' ? 'text-error-dark' : 'text-text-mid'}`}
                        >
                          {q.lastRunAt ? `${ago(q.lastRunAt)}${q.added ? ` · +${q.added}` : ''}${q.lastStatus === 'error' ? ' · failed' : ''}` : 'not yet'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
